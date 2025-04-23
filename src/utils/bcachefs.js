import React, {forwardRef,useState, Fragment,useEffect, useRef, useContext } from 'react';
import {WindowApi, useWindowManager} from "../rix/RixWindowManager";
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import RixPanel from "../rix/RixPanel";
import RixTable from "../rix/RixTable";
import RixTemplate from "../rix/RixTemplate";
import Config_Schema from "../components/config_schema.js";
import {context_value} from "../store/global_data";
import cmd from "./command.js";
import Disks from "./disks";
import JsonEditorForm from '../components/JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import moment from 'moment';

const {global_data, api, make_watch_data} = context_value;

const bcachefs = {
    command: "bcachefs",

    fs: {
        usage(path) {
            let args = [];
            args.push("fs");
            args.push("usage");
            args.push(path);
            return {
                command: "bcachefs",
                args
            };
        }
    },
    device: {
        remove(config) {
            let args = [];
            args.push('device');
            args.push('remove');
            args.push(config.device);
            args.push(config.mount_path);
            return {
                command: "bcachefs",
                args
            };
        },
        async remove_status(config) {
            let str = `ps aux | grep ${config.mount_path} | grep remove | grep -v grep`;
            let args = ['-c', str];
            return await api.run_command({command: "bash", args: args});
        },
        async add(config) {
            let args = [];
            args.push('device');
            args.push('add');
            args.push('-f');
            config.label && config.label != '' && args.push(`--label=${config.label}`);
            config.fs_size && config.fs_size != '' && args.push(`--fs_size=${config.fs_size}`);
            config.discard && config.discard == true && args.push(`--discard`);
            config.bucket && config.bucket != '' && args.push(`--bucket=${config.bucket}`);
            args.push(config.mount_path);
            args.push(config.device);
            return await api.run_command({command: "bcachefs",
                                args
                               });
        },
        online(config) {
            let args = [];
            args.push('device');
            args.push('online');
            args.push(config.device);
            return {
                command: "bcachefs",
                args
            };
        },
        offline(config) {
            let args = [];
            args.push('device');
            args.push('offline');
            args.push(config.device);
            return {
                command: "bcachefs",
                args
            };
        },
        evacuate(config) {
            let args = [];
            args.push('device');
            args.push('evacuate');
            args.push(config.device);
            return {
                command: "bcachefs",
                args
            };
        }
    },
    async format(config) {
        let args = [];
        args.push("format");
        args.push("-f");
        if(config['compression']) {
        args.push(`--compression=${config['compression']}`);
        }
        if(config['uuid']) {
            args.push(`--uuid=${config['uuid']}`);
        }
        if(config["encrypted"]) args.push("--encrypted");
        args.push(`--foreground_target=${config['foreground_target']}`);
        args.push(`--promote_target=${config['promote_target']}`);
        args.push(`--background_target=${config['background_target']}`);
        args.push(`--replicas=${config['replicas']}`);
        for(let disk of config['devices']) {
            if(disk.discard) {
                continue;
            }
            args.push(`--label=${disk.label}`);
            args.push(`${disk.path}`);
        }
        for(let disk of config['devices']) {
            if(!disk.discard) {
                continue;
            }
            args.push(`--discard`);
            args.push(`--label=${disk.label}`);
            args.push(`${disk.path}`);
        }
        return await api.run_command({
            command: this.command,
            args
        });
    },
    list(config) {
        let args = [];
        args.push("list");
        args.push(config['path']);
        return {
            command: this.command,
            args
        };
    },
    list_journal(config) {
        let args = [];
        args.push("list_journal");
        args.push(config['path']);
        return {
            command: this.command,
            args
        };
    },
    async mount(config) {
        let ret = await api.run_command({command: "bcachefs",
                                         args: ["mount",
                                                `UUID=${config.uuid}`,
                                                config.mount_path
                                               ]
                                        });
        return ret;
        /*
        let args = [];
        args.push("-t");
        args.push("bcachefs");
        args.push(config['label'].map(v=>v.path).join(':'));
        args.push(config.mount_path);
        return {
            command: "mount",
            args
        };
        */
    },
    async umount(config) {
        let ret = await api.run_command({command: "umount",
                                         args: [
                                                config.mount_path
                                               ]
                                        });
        return ret;
    },
    "parse":(input, mount_path)=> {
        console.log("bcachefs res=", input);
        const uuidMatch = input.match(/Filesystem:\s*([a-f0-9-]+)/i);
        const uuid = uuidMatch ? uuidMatch[1] : null;

        // Extract Size, Used, and Online reserved
        const sizeMatch = input.match(/Size:\s*([\d.]+\s*[TGMK]iB)/i);
        const size = sizeMatch ? sizeMatch[1] : null;

        const usedMatch = input.match(/Used:\s*([\d.]+\s*[TGMK]iB)/i);
        const used = usedMatch ? usedMatch[1] : null;

        const reservedMatch = input.match(/Online reserved:\s*([\d.]+\s*[TGMK]iB)/i);
        const reserved = reservedMatch ? reservedMatch[1] : null;
        // Function to extract size information for a device section
        function extractDeviceInfo(text, deviceStart) {
            const freeMatch = text.slice(deviceStart).match(/free:\s*([\d.]+\s*[TGMK]iB)/);
            const capacityMatch = text.slice(deviceStart).match(/capacity:\s*([\d.]+\s*[TGMK]iB)/);
            return {
                free: freeMatch ? freeMatch[1].trim() : null,
                capacity: capacityMatch ? capacityMatch[1].trim() : null
            };
        }
        // Extract device information
        //const deviceRegex = /(\w+\.\w+)\s+\(device\s+(\d+)\):\s+(\w+)\s+(rw|ro)/g;
        const deviceRegex = /([\w.-]+(?:_[\w.-]+)*)\s*\(device\s+(\d+)\):\s*([\w-]+)\s+(rw|ro)/g;
        let devices = [];
        let match;
        while ((match = deviceRegex.exec(input)) !== null) {
            const deviceInfo = extractDeviceInfo(input, match.index);
            let deviceName = match[3];
            let path = `/dev/${match[3]}`;
            if(deviceName.startsWith('dm-')) {
                let find = null;
                let f = global_data.blockdevices.filter(v=> {
                    return Disks.match_dm_dev(v, deviceName, (dev)=> {
                        dev.mountpoint = mount_path;
                        find = dev;
                    });
                })[0];
                if(f&&find) {
                    path = find.path;
                }
            }
            devices.push({
                label: match[1],
                deviceId: match[2],
                devid: match[2],
                deviceName: deviceName,
                path: path,
                mode: match[4],
                size: deviceInfo?.capacity??`unknown`,
                ...deviceInfo
            });
        }
        return {
            uuid: uuid,
            size: size,
            used: used,
            reserved: reserved,
            devices: devices
        };
    },
    async info(path) {
        let ret = await api.run_command({command: "bcachefs", args: ['fs', 'usage', "-h", path]});
        if(ret.ret == 0) {
            let info = bcachefs.parse(ret.data.stdout, path);
            console.log("info.devices===", info.devices, path);
            Disks.update_blockdevice(info.devices, path);
            return info;
        }
        return null;
    },
    update_info(self_data) {
        bcachefs.info(self_data.mount_path).then(async(res)=>{
            if(res) {
                let old_devices = self_data?.devices??[];
                let new_info = res;
                let out_device = old_devices.filter(v=> {
                    let index = new_info.devices.findIndex(v2=>v2.path == v.path);
                    if(index < 0) {
                        return true;
                    }
                    return false;
                });
                if(out_device.length > 0) {
                    Disks.update_blockdevice(out_device, null);
                }
                let index = global_data.pools.findIndex(v=>v.uuid == self_data.uuid);
                if(index >= 0) {
                    let pool = global_data.pools[index];
                    console.log("ready get info==", self_data);
                    let info = await bcachefs.info(self_data.mount_path);
                    console.log("old_pool data=", pool, "newinfo==", info);
                    global_data.pools.splice(index, 1, {...pool,
                                                        ...info});
                    global_data.update('pools');
                    self_data.set('name', pool.name);
                }
                self_data.set("devices", res.devices);
            } else {
                //console.log("update_info====", self_data, res);
                self_data.set("status", 'ready');
            }
        });
    },
    AddDevice(props) {
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
        let jsonEditorFormRef = useRef(null);
        let data = props.data;
        let config = {
            mount_path: data?.mount_path??'',
            uuid: data?.uuid??'',
        };
        let save = async ()=> {
            let data = jsonEditorFormRef.current.getValue();
            let ret = await props.onSave(data);
            console.log("save ret====", ret);
            if(ret) {
                closeDialog(props.id);
            }
        };
        let close = ()=> {
        };
        let schema = {
            ...Config_Schema,
            "$ref": `#/definitions/${props.schema}`
        };
        let title = `添加硬盘到池`;
        if(props.schema == 'bcachefs_replace_device') {
            title = `替换硬盘`;
        }
        // <div type="title"><Title/></div>
            return <RixDialog id={props.id}>
            <div type="content">
            <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
            </div>
            <button type="action" className="button primary" onClick={save}>保存</button>
            <button type="action" className="button js-dialog-close" onClick={close}>取消</button>
            </RixDialog>;
    },
    ModifyPool(props) {
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
        let jsonEditorFormRef = useRef(null);
        let data = props.data;
        let config = {
            name: data?.name??'',
            auto_mount: data?.auto_mount??true,
            mount_option: data?.mount_option??'',
            type: 'bcachefs',
            mount_path: data?.mount_path??'',
            uuid: data?.uuid??'',
        };
        let save = async ()=> {
            let data = jsonEditorFormRef.current.getValue();
            let ret = await props.onSave(data);
            console.log("save ret====", ret);
            if(ret) {
                closeDialog(props.id);
            }
        };
        let close = ()=> {
        };
        let schema = {
            ...Config_Schema,
            "$ref": `#/definitions/${props.schema}`
        };
        let title = `修改参数（下次启动）`;
        // <div type="title"><Title/></div>
            return <RixDialog id={props.id}>
            <div type="content">
            <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
            </div>
            <button type="action" className="button primary" onClick={save}>保存</button>
            <button type="action" className="button js-dialog-close" onClick={close}>取消</button>
            </RixDialog>;
    },
    InitPool(props) {
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
        let jsonEditorFormRef = useRef(null);
        let data = props.data;
        let config = {
        };
        let save = async ()=> {
            let data = jsonEditorFormRef.current.getValue();
            let list = global_data.get('blockdevices');
            let match_dev= (v, path)=> {
                if(v.path == path) return true;
                if(v.children && v.children.length > 0) {
                    let f = v.children.filter(v2=> {
                        if(v2.path == path) return true;
                        return match_dev(v2, path);
                    })[0];
                    if(f) return true;
                }
                return false;
            };
            let check_discard = (path)=> {
                for(let one of list) {
                    let check = match_dev(one, path);
                    if(check) {
                        if(parseInt(one['disc-gran'])>0
                           && parseInt(one['disc-max']) > 0) {
                            return true;
                        }
                    }
                }
                return false;
            };
            for (let dev of data.devices) {
                if(check_discard(dev.path)) {
                    dev.discard = true;
                } else {
                    dev.discard = false;
                }
            }
            let ret = await bcachefs.format({
                ...data,
                uuid: props.data.uuid
            });
            console.log("format ret==", ret);
            if(ret&&ret.ret == 0) {
                let ret = await props.onSave(data);
                if(ret){
                    closeDialog(props.id);
                }
            }
            /*
            let ret = await props.onSave(data);
            console.log("save ret====", ret);
            if(ret) {
                closeDialog(props.id);
            }*/
        };
        let close = ()=> {
        };
        let schema = {
            //...Config_Schema,
            "definitions": {
                "bcachefs_device": {
                    "type": "object",
                    "title": "选择设备",
                    "properties": {
                        "path": {
                            "type": "string",
                            "format": "disk_select",
                        },
                        "label": {
                            "type": "string",
                            "title": "标签",
                            "default": ""
                        },
                        "fs_size": {
                            "type": "string",
                            "title": "fs_size",
                            "default": ""
                        },
                        "discard": {
                            "type": "boolean",
                            "title": "discard",
                            "default": false
                        },
                        "bucket": {
                            "type": "string",
                            "title": "bucket",
                            "default": ""
                        }
                    },
                    "required": [
                        "path",
                        "label",
                        "fs_size",
                        "discard",
                        "bucket"
                    ]
                },
                "bcachefs_init_pool": {
                    "type": "object",
                    "properties": {
                        "replicas": {
                            "type": "number",
                            "title": "副本数量",
                            "default": 2
                        },
                        "foreground_target": {
                            "type": "string",
                            "title": "foreground_target",
                            "default": "ssd"
                        },
                        "promote_target": {
                            "type": "string",
                            "title": "promote_target",
                            "default": "ssd"
                        },
                        "background_target": {
                            "type": "string",
                            "title": "background_target",
                            "default": "hdd"
                        },
                        "devices": {
                            "type": "array",
                            "title": "设备",
                            //"format": "table",
                            "items": {
                                "$ref": `#/definitions/bcachefs_device`
                            }
                        }

                    },
                    "required": [
                        "replicas",
                        "foreground_target",
                        "promote_target",
                        "background_target",
                        "devices"
                    ]
                }
            },
            "$ref": `#/definitions/bcachefs_init_pool`
        };
        let title = `初始化池`;
        // <div type="title"><Title/></div>
        return <RixDialog id={props.id}>
            <div type="content">
            <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
            </div>
            <button type="action" className="button primary" onClick={save}>保存</button>
            <button type="action" className="button js-dialog-close" onClick={close}>取消</button>
            </RixDialog>;
    },
    Render(props) {
        let {data} = props;
        let self_data = make_watch_data({...data,
                                         status: 'ok',
                                         info:'',
                                        });
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;
        let remove_status = ()=> {
            let remove_timer = setTimeout(async ()=> {
                clearTimeout(remove_timer);
                let c = await bcachefs.device.remove_status({
                    mount_path: self_data.mount_path
                });
                if(c.ret >= 0) {
                    if(c.data.stdout.trim()=="") {
                        self_data.set("status", "ok");
                        self_data.set('info', '');
                        bcachefs.update_info(self_data);
                        return;
                    } else {
                        self_data.set('info', c.data.stdout);
                    }
                }
                remove_status();
            }, 1000);
            self_data.set('remove_timer', remove_timer);
        };
        useEffect(()=> {
            bcachefs.update_info(self_data);
            bcachefs.device.remove_status({
                mount_path: self_data.mount_path
            }).then(res=>{
                if(res.ret >= 0) {
                    if(res.data.stdout.trim()!= "") {
                        remove_status();
                        self_data.set('info', res.data.stdout);
                        self_data.set("status", "remove");
                    }
                }
            });
        },[]);
        let Title = ()=> {
            let [state, update] = useState(0);
            useEffect(()=> {
                let w= self_data.watch('name', ()=> {
                    update(prev=>prev+1);
                });
                let d= self_data.watch('devices', ()=> {
                    update(prev=>prev+1);
                });
                return ()=> {
                    self_data.unwatch('name', w);
                    self_data.unwatch('devices', d);
                };
            },[]);
            let str = '';
            if(self_data.name) {
                str = `${self_data.name} 挂载位置:${self_data.mount_path} ${self_data.used}/${self_data.size}`;
            } else {
                str = `挂载位置:${self_data.mount_path} 分区类型:${self_data.type} `;
            }
            if(!self_data.devices) {
                str += `（未挂载）`;
            }
            return str;
        };
        let savepool = async (data) => {
            let pools = global_data.pools || [];
            data.devices = data.devices||self_data.devices;
            let index = pools.findIndex(v=>v.uuid == data.uuid);
            if(index>=0) {
                pools.splice(index, 1, data);
            } else {
                pools.push(data);
            }
            self_data.set("name", data.name);
            self_data.set("mount_path", data.mount_path);
            global_data.set('pools', pools);
            api.config_file({
                filename: '/app/config/pools.config',
                'op': 'put',
                data: JSON.stringify(pools)
            }).then(ret=> {
                console.log("save orig===", ret);
                if(ret.ret == 0) {
                    return 0;
                    //mydialog.current.close();
                }
                return -2;
            });
            return -2;
        };
        let add_to_pool = ()=>{
            let id = 'dialog_'+Date.now();
            let AddPool = (props)=>{
                let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
                let jsonEditorFormRef = useRef(null);
                let data = props.data;
                let config = {
                    type: data.type??'bcachefs',
                    mount_path: data?.mount_path??'',
                    mount_option: data?.mount_option??'',
                    name: data?.name??'',
                    uuid: data?.uuid??'',
                    auto_mount: data?.auto_mount??false,
                };
                let save = async ()=> {
                    let data = jsonEditorFormRef.current.getValue();
                    let ret = await props.save(data);
                    console.log("save ret====", ret);
                    if(ret == 0) {
                        closeDialog(props.id);
                    }
                };
                let close = ()=> {
                };
                let schema = {
                    ...Config_Schema,
                    "$ref": `#/definitions/add_to_pool`
                };
                let title = `注册到存储池`;
                if(props.schema == 'modify_pool') {
                    title = `修改存储池`;
                }
                return <RixDialog id={props.id}>
                    <div type="title"><Title/></div>
                    <div type="content">
                    <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
                    </div>
                    <button type="action" className="button primary" onClick={save}>保存</button>
                    <button type="action" className="button js-dialog-close" onClick={close}>取消</button>
                    </RixDialog>;
            };
            openDialog({
                id,
                content: <AddPool data={data} schema='add_to_pool' save={savepool} id={id}/>
            });
        };
        let Register=()=> {
            let pools = global_data.pools || [];
            let index = pools.findIndex(v=>v.uuid == data.uuid);
            if(index>=0) {
                return <></>;
            }
            return <RixButton className="button success" onClick={add_to_pool}>注册</RixButton>;
        };
        let mount = async()=> {
            let ret = bcachefs.mount(self_data);
            if(ret.ret == 0) {
                self_data.set("state", "ok");
                bcachefs.update_info(self_data);
            } else {
                self_data.set("info", JSON.stringify(ret));
            }
        };
        let umount = async()=> {
            let ret = await bcachefs.umount(self_data);
            if(ret.ret == 0) {
                self_data.set("state", "ok");
                bcachefs.update_info(self_data);
            } else {
                self_data.set("info", JSON.stringify(ret));
            }
        };
        let Mount=()=> {
            let [state, update] = useState(0);
            useEffect(()=> {
                let w = self_data.watch('status', ()=> {
                    update(prev=>prev+1);
                });
                let d = self_data.watch('devices', ()=> {
                    update(prev=>prev+1);
                });
                return ()=> {
                    self_data.unwatch('status', w);
                    self_data.unwatch('devices', w);
                };
            },[]);
            if(self_data.status == 'ok') {
                if(self_data.devices) {
                    return <RixButton className="button success" onClick={umount}>卸载</RixButton>;
                }
            }
            if(self_data.status == 'ready') {
                if(self_data.devices) {
                return <RixButton className="button success" onClick={mount}>挂载</RixButton>;
                }
            }
            return <></>;
        };
        let add_device_to_pool = async (data)=> {
            console.log("bcachefs add_device_to_pool==", data);
            if(self_data.mount_option == '') {
            }
            let  ret = await bcachefs.device.add(data);
            if(ret.ret == 0) {
                bcachefs.update_info(self_data);
                return  true;
            }
            return false;
        };
        let add_device = ()=> {
            let id = 'dialog_'+Date.now();
            let config = {
                uuid: self_data.uuid,
                mount_path: self_data.mount_path,
            };
            openDialog({
                id,
                content: <bcachefs.AddDevice data={config} schema="bcachefs_add_device" id={id} onSave={add_device_to_pool}/>
            });
        };
        let init_pool = ()=> {
            let id = 'dialog_'+Date.now();
            let config = {
                uuid: self_data.uuid,
                mount_path: self_data.mount_path,
            };
            let save = (data)=> {
                console.log("init_pool data=", data);
                self_data.devices = data.devices.map(v=> {
                    return {
                        label: v.label,
                        path: v.path
                    };
                });
                let index = global_data.pools.findIndex(v=>v.uuid == self_data.uuid);
                if(index >= 0) {
                    let add_data = {
                        name: self_data.name,
                        mount_option: "",
                        type: "bcachefs",
                        uuid: self_data.uuid,
                        devices: self_data.devices,
                        mount_path: self_data.mount_path
                    };
                    global_data.pools.splice(index, 1, add_data);
                    global_data.update('pools');
                    console.log("set_data====", self_data);
                    self_data.update('devices');
                    self_data.set('status', "ready");
                    let pools = global_data.pools;
                    api.config_file({
                        filename: '/app/config/pools.config',
                        'op': 'put',
                        data: JSON.stringify(pools)
                    }).then(ret=> {
                        console.log("save orig===", ret);
                        if(ret.ret == 0) {
                            return 0;
                            //mydialog.current.close();
                        }
                        return -2;
                    });
                }
                return -2;
            };
            openDialog({
                id,
                content: <bcachefs.InitPool data={self_data} schema="bcachefs_init" id={id} onSave={save}/>
            });

        };
        let AddDevice = ()=> {
            let [state, update] = useState(0);
            useEffect(()=> {
                let w = self_data.watch('status', ()=> {
                    update(prev=>prev+1);
                });
                let d = self_data.watch('devices', ()=> {
                    update(prev=>prev+1);
                });
                return ()=> {
                    self_data.unwatch('state', w);
                    self_data.unwatch('devices', w);
                };
            },[]);
            if(self_data.devices&&self_data.status == 'ok') {
                return <RixButton className="button success" onClick={add_device}>添加</RixButton>;
            }
            console.log("self_data==", self_data);
            if(self_data.devices.length == 0) {
                return <RixButton className="button alert" onClick={init_pool}>初始化</RixButton>;
            } else {
                return <RixButton className="button alert" onClick={init_pool}>重置</RixButton>;
            }
            return <></>;
        };
        let Modify = ()=> {
            let click = ()=> {
                //modify(self_data);
                console.log("modify====", self_data);
                let id = 'dialog_'+Date.now();
                let config = self_data;
                openDialog({
                    id,
                    content: <bcachefs.ModifyPool data={config} schema="modify_pool" id={id} onSave={savepool}/>
                });
            };
            return <RixButton className="button success" onClick={click}>修改</RixButton>;
            return <></>;
        };
        let Balance = ()=> {
        };
        let Info = ()=> {
            let [state, update] = useState(0);
            useEffect(()=> {
                let w = self_data.watch('info', ()=> {
                    update(prev=>prev+1);
                });
                return ()=> {
                    self_data.unwatch('info', w);
                };
            },[]);
            if(self_data.info&&self_data.info != '') {
                return <span>{self_data.info}</span>;
            }
            return <></>;
        };
        let RendDeviceTable=()=> {
            let [state, update] = useState(0);
            useEffect(()=> {
                let w = self_data.watch('devices', ()=> {
                    update(prev=>prev+1);
                });
                return ()=> {
                    self_data.unwatch('devices', w);
                };
            },[]);
            let remove = async (e,{row})=> {
                let temp_cmd = `#/bin/bash
nohup bcachefs device remove ${row.devid} ${self_data.mount_path} &> /dev/null &
`;
                let write_ret = await api.config_file({ filename: '/tmp/device_remove.sh', 'op': "put", data: temp_cmd });
                if(write_ret.ret == 0) {
                    let remove_ret = await api.run_command({
                        command: "bash",
                        args:["/tmp/device_remove.sh"]
                    });
                    if(remove_ret.ret == 0) {
                        self_data.set("status", "remove");
                        remove_status();
                        //update_pool();
                    }
                }
            };
            if(self_data.devices) {
                let Health = ({row})=> {
                    return Disks.RendHealth(row);
                };
                let RWStatus = ({row})=> {
                    return Disks.RendStats(row);
                };
                let Rend_Editor=({row})=> {
                    let [state, update] = useState(0);
                    useEffect(()=> {
                        let w= self_data.watch('status', ()=> {
                            update(prev=>prev+1);
                        });
                        return ()=> {
                            self_data.unwatch('status', w);
                        };
                    },[]);
                    if(self_data.status != 'ok') return <></>;
                    if(self_data.devices.length > 1) {
                        return <><RixButton className="button success" onClick={(e)=>remove(e,{row})}>移除</RixButton>
                            </>;
                    }
                    return <></>;
                };
                return <RixTable data={self_data.devices}>
                    <RixTable.TableColumn label="devid" prop="devid">
                    </RixTable.TableColumn>
                    <RixTable.TableColumn label="path" prop="path">
                    </RixTable.TableColumn>
                    <RixTable.TableColumn label="标签" prop="label">
                    </RixTable.TableColumn>
                    <RixTable.TableColumn label="size" prop="size">
                    </RixTable.TableColumn>
                    <RixTable.TableColumn label="健康度(已消耗)" >
                    <RixTemplate slot-scope="{row}">
                    <Health>
                    </Health>
                    </RixTemplate>
                    </RixTable.TableColumn>
                    <RixTable.TableColumn label="读/写速度" >
                    <RixTemplate slot-scope="{row}">
                    <RWStatus />
                    </RixTemplate>
                    </RixTable.TableColumn>
                    <RixTable.TableColumn label="编辑">
                    <RixTemplate slot="header" slot-scope="scope">
                    </RixTemplate>
                    <RixTemplate slot-scope="{row}">
                    <Rend_Editor/>
                    </RixTemplate>
                    </RixTable.TableColumn>
                    </RixTable>;
            }
            return <div>未挂载</div>;
        };
        return <RixPanel collapsible>
            <Title type='title'/>
            <div type='icon' class="mif-apps"/>
            <Register type="button"/>
            <Mount type="button"/>
            <AddDevice type="button"/>
            <Modify type="button"/>
            <Balance type="button"/>
            <Info />
            <RendDeviceTable/>
            </RixPanel>;
    }
};

export default bcachefs;
