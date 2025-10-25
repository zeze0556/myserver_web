import React, {forwardRef,useState, Fragment,useEffect, useRef, useContext } from 'react';
import {WindowApi, useWindowManager} from "../rix/RixWindowManager";
import { v4 as uuidv4 } from 'uuid';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import JsonEditorForm from '../components/JsonEditorForm';
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import RixPanel from "../rix/RixPanel";
import RixTable from "../rix/RixTable";
import RixTemplate from "../rix/RixTemplate";
import Config_Schema from "../components/config_schema.js";
import {context_value} from "../store/global_data";
import cmd from "./command.js";

const {global_data, api, make_watch_data} = context_value;

const disks = {
    async rm(dir) {
        if(dir.trim() == '/') return {ret:-2};
        let p = {
            command: "rm",
            args:["-f", dir]
        };
        return await api.run_command(p);
    },
    async mkdir(dir) {
        let p = {
            command: "mkdir",
            args:["-p", dir]
        };
        return await api.run_command(p);
    },
    parseSizeAndUnit(input) {
        // 匹配数字和单位的正则表达式
        const match = input.match(/^(\d+\.?\d*)\s*([GMK]?)$/i);

        if (match) {
            const size = Math.round(parseFloat(match[1]));
            const unit = match[2].toUpperCase();

            // 根据单位转换大小
            let newSize;
            switch (unit) {
            case 'G':
                newSize = size * 1024 * 1024 * 1024;
                break;
            case 'M':
                newSize = size * 1024 * 1024;
                break;
            case 'K':
                newSize = size * 1024;
                break;
            default:
                newSize = size;
            }

            return { size: newSize, unit, block:size };
        } else {
            // 如果匹配失败，返回null或适当的错误处理
            return null;
        }
    },
    RendStats(props) {
        let path = props.path;
        if(!path) {
            path = "error";
        }
        let dm = false;
        if(path.startsWith('/dev/mapper/')) {
            dm = true;
        }
        let [state, setState] = useState({});
        useEffect(()=> {
            let w = global_data.watch('sysstat', (v)=> {
                let f = v.filter(disk=> {
                    if(dm) {
                        if(props.deviceName == disk.Device) return true;
                        return false;
                    }
                    if(path.startsWith('/dev/'+disk.Device)) return true;
                    return false;
                })[0];
                if(f) {
                    setState(f);
                }
            });
            return ()=> {
                global_data.unwatch('sysstat', w);
            };
        });
        if(state['Device']) {
            return <>{state['kB_read/s']}/{state['kB_wrtn/s']}</>;
        }
        return <></>;
    },
    match_dev(v, path){
        if(v.path == path) return true;
        if(v.children && v.children.length > 0) {
            let f = v.children.filter(v2=> {
                if(v2.path == path) return true;
                return disks.match_dev(v2, path);
            })[0];
            if(f) return true;
        }
        return false;
    },
    match_dm_dev(v, kname, callback) {
        if(v.kname== kname) {
            callback(v);
            return true;
        }
        if(v.children && v.children.length > 0) {
            let f = v.children.filter(v2=> {
                if(v2.kname == kname) {
                    callback(v2);
                    return true;
                }
                return disks.match_dm_dev(v2, kname, callback);
            })[0];
            if(f) return true;
        }
        return false;

    },
    get_device(path) {
        let devices= global_data.get('blockdevices', []);
        if(devices&&devices.length > 0) {
            if(path.startsWith('/dev/mapper/')) {
                let search_children = (v)=> {
                    if(v.path == path) return true;
                    let children = v.children || [];
                    let f = children.filter(v=> {
                        return search_children(v);
                    })[0];
                    if(f) return true;
                    return false;
                };
                let f = devices.filter(v=> search_children(v))[0];
                return f;
            } else {
                let f = devices.filter(v=> {
                    if(path.startsWith(v.path)) {
                        return true;
                    }
                    return false;
                })[0];
                return f;
            }
        }
        return null;
    },
    RendHealth(props) {
        let path = props.path;
        if(!path) {
            path = 'error';
        }
        if(!props.path) console.log(`error ${JSON.stringify(props)}`);
        let device = disks.get_device(path);
        if(!device) {
            console.log(`error=====${JSON.stringify(props)}`, global_data.blockdevices);
            device = {
                path: 'error'
            };
        }
        let f = (global_data?.disks_health??[]).filter(disk=> disk.device==device.path)[0];
        let [state, setState] = useState(f||{});
        useEffect(()=> {
            let w = global_data.watch('disks_health', (v)=> {
                let f = v.filter(disk=> disk.device==device.path)[0];
                if(f) {
                    setState(f);
                }
            });
            return ()=>{
                global_data.unwatch('disks_health', w);
            };
        },[]);
        if(f)
        switch(state.type) {
        case 'hdd':
            let str = `健康`;
            state.attributes.forEach(v=> {
                if(v.id == 5&&v.value >0) {
                    str += `故障:(${v.id}[${v.name}]=${v.value})尽快更换`;
                } else {
                    if(v.value > 0) {
                        str += `警告(${v.id}[${v.name}]=${v.value})`;
                    }
                }
            });
            return str;
        case 'nvme':
        case 'ssd':
            return state.life;
        }
        return 'unknown';
    },
    update_blockdevice(devices, mount_path) {
        let global_data = context_value.global_data;
        let list = global_data.get('blockdevices', []);
        if(list&&list.length > 0) {
            devices.forEach(v=> {
                let f= list.filter(d=>v.path.startsWith(d.path))[0];
                if(f&&f.children) {
                    let part = f.children.filter(d=>v.path == d.path)[0];
                    if(part) {
                        part.mountpoint = mount_path;
                        return;
                    }
                }
                if(f&&f.path == v.path) {
                    f.mountpoint= mount_path;
                }
            });
            global_data.update('blockdevices');
        }
    },
    health:{
        async cmd(){
            let req = {
                command: '/app/scripts/hd_tools.sh',
                args:[]
            };
            let res = await api.run_command(req);
            if(res.ret == 0) {
                let p = disks.health.parse(res.data.stdout);
                global_data.set('disks_health', p);
                return p;
            }
            return res;
        },
        parse(input) {
            const devices = [];
            const blocks = input.split(`\n\n`);
            blocks.forEach(input=> {
                let currentDevice = null;
                if (input.startsWith('HDD health attributes for')) {
                    const [first, ...rest] = input.trim().split('\n');
                    const parts = first.split(':');
                    currentDevice = {
                        device: parts[0].split(' ')[4],
                        type: 'hdd',
                        attributes: []
                    };
                    rest.forEach(line=> {
                        const parts = line.split(/\s+/);
                        currentDevice.attributes.push({
                            id: parts[0],
                            name: parts[1],
                            value: parts[9]
                        });
                    });
                } else if (input.startsWith('SSD used life for') || input.startsWith('NVMe used life for')) {
                    const parts = input.split(':');
                    currentDevice = {
                        device: parts[0].split(' ')[4],
                        type: input.startsWith('NVMe') ? 'nvme' : 'ssd',
                        life: parts[1].trim()
                    };
                }
                if(currentDevice) {
                    devices.push(currentDevice);
                }
            });
            return devices;
        }
    },
    RendDeviceChildren(props) {
        let children = props.children;
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;
        let LucksFormat = (row)=> {
            let id = 'dialog_'+Date.now();
            let config = {
            };
            let save = (data)=> {
                console.log("lucksformat save==", data);
                closeDialog(id);
                api.disk_info({});
            };
            openDialog({
                id,
                content: <disks.cryptsetup.Format data={row} schema="cryptsetup_format" id={id} onSave={save}/>
            });
        };
        let Rend_Luks = ({row})=> {
            if(row.fstype == 'crypto_LUKS') {
                console.log("children row==", row);
                if(row.children&&row.children.length > 0) {
                    return <>
                        <RixButton className="button success" onClick={()=>disks.cryptsetup.close(row)}>关闭</RixButton>
                        <RixButton className="button alert" onClick={(e)=>disks.cryptsetup.remove(row)}>移除</RixButton>
                        </>;
                }
                return <>
                    <RixButton className="button success" onClick={()=>disks.cryptsetup.open(row)}>打开</RixButton>
                    <RixButton className="button alert" onClick={(e)=>disks.cryptsetup.remove(row)}>移除</RixButton>
                    </>;
            }
            else {
                if(!row.use_state) {
                return <RixButton className="button success" onClick={(e)=>LucksFormat(row)}>加密使用</RixButton>;
                } else {
                    return <></>;
                }
            }
        };
        let Rend_Editor = ({row})=> {
            if(row.ro) {
                return <></>;
            }
            if(row.type == 'loop') {
                return <Rend_Luks row={row}/>;
            }
            let format = <></>;
            if(!row.use_state) {
                format = <RixButton className="button alert" onClick={(e)=>console.log(e,{row})}>格式化</RixButton>;
            }
            return <>
                {format}
                <Rend_Luks row={row}/>
                </>;
        };
        let Rend_Type = ({row})=> {
            if(row.fstype) {
            return row.fstype;
            }
            return row.parttypename;
        };
        return <RixTable data={children}>
            <RixTable.TableColumn label="路径" prop="path"/>
            <RixTable.TableColumn label="分区类型">
            <RixTemplate slot-scope="{row}">
            <Rend_Type/>
            </RixTemplate>
            </RixTable.TableColumn>
            <RixTable.TableColumn label="容量" prop="size"></RixTable.TableColumn>
            <RixTable.TableColumn label="分区uuid" prop="ptuuid">
            </RixTable.TableColumn>
            <RixTable.TableColumn label="挂载位置" prop="mountpoint"/>
            <RixTable.TableColumn label="编辑">
            <RixTemplate slot="header" slot-scope="scope">
            </RixTemplate>
            <RixTemplate slot-scope="{row}">
            <Rend_Editor/>
            </RixTemplate>
            </RixTable.TableColumn>
            </RixTable>;

    },

    cryptsetup:{
        async get_config() {
            let ret = await api.config_file({
                filename: '/app/config/cryptsetup.config',
                'op': 'get',
            });
            return ret;
        },
        async put_config(data) {
            let ret = await api.config_file({
                filename: '/app/config/cryptsetup.config',
                'op': 'put',
                'data': JSON.stringify(data)
            });
            return ret;
        },
        async remove(row) {
            let ret = await disks.cryptsetup.close(row);
            console.log("remove ret===", ret,row);
            if(ret.ret == 0) {
                let config = await disks.cryptsetup.get_config();
                if(config&&config.children) {
                    if(row.children) {
                        for(let cur of row.children){
                            //if(cur.type != 'crypt') continue;
                            console.log("cur===", cur);
                            let index = config.children.findIndex(v=>{
                                return disks.cryptsetup.check_match(v, cur);
                            });
                            console.log("find row index===", index);
                            if(index>=0) {
                                await disks.rm(config.children[index].keyfile);
                                config.children.splice(index,1);
                            }
                        }
                    }
                    if(true) {
                        console.log("remove111111 row=", row);
                        let cur = row;
                        let index = config.children.findIndex(v=>{
                            return disks.cryptsetup.check_match(v, row);
                        });
                        console.log("find row index===", index);
                        if(index>=0) {
                            await disks.rm(config.children[index].keyfile);
                            config.children.splice(index,1);
                        }
                    }
                }
                await disks.cryptsetup.put_config(config);
                api.disk_info({});
            }
        },
        CmdContent(props) {
            const terminal = useRef(null);
            const shell_ref = useRef(null);
            let [container_up_message, set_container_up_message] = useState("");
            useEffect(()=> {
                terminal.current = new Terminal({
                    //rendererType: 'canvas',
                    rows: 40,
                    convertEol: true,
                    scrollback: 10,
                    disableStdin: false,
                    cursorStyle: 'underline',
                    cursorBlink: true
                });
                let socket = null;
                const fitAddon = new FitAddon();
                terminal.current.loadAddon(fitAddon);
                terminal.current.onResize((size) => {
                    // 调整 xterm 和 WebSocket 的窗口大小
                    fitAddon.fit();
                    const dimensions = fitAddon.proposeDimensions();
                    if (dimensions?.cols && dimensions?.rows) {
                        // term.resize(dimensions.cols, dimensions.rows);
                        terminal.current.resize(dimensions.cols, dimensions.rows);
                        /*
                          socket.send(
                          JSON.stringify({
                          type: 'resize',
                          cols: dimensions.cols,
                          rows: dimensions.rows,
                          }),
                          );
                        */
                    }
                });
                terminal.current.open(shell_ref.current);
                cmd.long_cmd(props.cmd, {
                    onopen:(ws)=> {
                        socket = ws;
                        terminal.current.focus();
                        fitAddon.fit();
                        terminal.current.onData((data) => {
                            ws.send(JSON.stringify({"op":"input",
                                                    stdin:data}));
                        });
                    },
                    stdout:(out)=> {
                        let j = JSON.parse(out);
                        if(j.op == 'out') {
                            if (terminal.current)
                                terminal.current.write(j.stdout);
                        }
                    },
                    stderr: (err) => {
                        console.log("container stderr=", err);
                    },
                    onerr: (err) => {
                        console.log("container err=", err);
                    },
                    onend:()=> {
                        if(props.onEnd)
                            props.onEnd();
                    }
                });
            },[]);
            return <div type="content" ref={shell_ref} width="100%" height="100%">
                </div>;
        },
        CommandDialog(props1) {
            let {command, title} = props1;
            let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;
            let Dialog = (props)=> {
                return <RixDialog width="fit-content" id={props.id}>
                    <div type="title">{title}</div>
                    <div type="content">
                    <disks.cryptsetup.CmdContent cmd={command} onEnd={()=>{
                        closeDialog(props.id);
                        if(props1.onEnd) {
                            props1.onEnd();
                        }
                    }}/>
                    </div>
                    <button type="action" className="button js-dialog-close">
                    关闭
                </button>
                    </RixDialog>;
            };
            let id = 'dialog_'+Date.now();
            openDialog({
                id,
                content: <Dialog id={id}/>
            });
        },
        check_match(v, v2, all=true, callback=console.log) {
            switch(v.by) {
            case 'by-id': {
                if(v['by-id'] == `wwn-${v2['wwn']}`) {
                    callback(v);
                    return true;
                }
            }
                break;
            case 'by-partuuid': {
                if(v['by-partuuid'] == v2['partuuid']) {
                    callback(v);
                    return true;
                }
                break;
            }
            case 'by-path': {
                if(v['by-path'] == v2['path']) {
                    callback(v);
                    return true;
                }
            }
            }
            if(all&&v2.children) {
                for(let cur of v2.children) {
                    if(disks.cryptsetup.check_match(v, cur)) {
                        callback(v);
                        return true;
                    }
                }
            }
            return false;
        },
        Format(props) {
            let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
            let jsonEditorFormRef = useRef(null);
            let data = props.data;
            let config = {
                path: data.path,
                uuid: uuidv4(),
            };
            config.keyfile = `/app/cryptsetup_keyfiles/${config.uuid}.key`;
            let save = async ()=> {
                let data = jsonEditorFormRef.current.getValue();
                console.log("save==", data);
                await disks.mkdir(`/app/cryptsetup_keyfiles`);
                 api.run_command({command: "dd",
                                  args: [
                                      `if=/dev/urandom`,
                                      `of=${data.keyfile}`,
                                      `bs=32M`,
                                      `count=1`
                                  ]
                                 }).then(keyfile_ret=> {
                                     if(keyfile_ret.ret == 0) {
                                         let onEnd = async ()=> {
                                             if(props.data.type == 'disk') {
                                                 data.type = 'disk';
                                                 data.by = 'by-id';
                                                 data['by-id'] = `wwn-${props.data.wwn}`;
                                             } else if(props.data.type == 'part') {
                                                 data.type = 'part';
                                                 data.by = 'by-partuuid';
                                                 data['by-partuuid'] = `${props.data.partuuid}`;
                                             } else {
                                                 data.type="img_file";
                                                 data.by = 'by-path';
                                                 data['by-path'] = data.path;
                                             }
                                             let config = null;
                                             try {
                                             config = await disks.cryptsetup.get_config();
                                             } catch (e) {
                                                 console.log("cryptsetup get_config error=", e);
                                                 config = null;
                                             }
                                             if(!config) {
                                                 config = {
                                                     children:[]
                                                 };
                                             }
                                             config.children = config.children || [];
                                             let index = config.children.findIndex(v=> {
                                                 switch(data.by) {
                                                 case 'by-id': {
                                                     if(v['by-id'] == data['by-id']) return true;
                                                 }
                                                     break;
                                                 case 'by-partuuid': {
                                                     if(v['by-partuuid'] == data['by-partuuid']) return true;
                                                     break;
                                                 }
                                                 case 'by-path': {
                                                     if(v['by-path'] == data['by-path']) return true;
                                                 }
                                                 }
                                                 return false;
                                             });
                                             if(index>=0) {
                                                 config.children.splice(index, 0, data);
                                             } else {
                                                 config.children.push(data);
                                             }
                                             let ret = await disks.cryptsetup.put_config(config);
                                             {
                                                 if(data.auto_open) {
                                                     let clone_d = JSON.parse(JSON.stringify(data));
                                                     switch(clone_d.by) {
                                                     case 'by-id': {
                                                         clone_d['wwn']= clone_d['by-id'].substring('wwn-'.length);
                                                     }
                                                         break;
                                                     case 'by-partuuid': {
                                                         clone_d['partuuid'] = clone_d['by-partuuid'];
                                                     }
                                                         break;
                                                     case 'by-path': {
                                                         clone_d['path'] = clone_d['by-path'];
                                                     }
                                                         break;
                                                     }
                                                     await disks.cryptsetup.open(clone_d);
                                                 }
                                             }
                                             props.onSave(ret);
                                         };
                                         let cmd = {
                                             command: "/app/scripts/cryptsetup_help.sh",
                                             args: [
                                                 'format',
                                                 '-q',
                                                 "-d",
                                                 data.path,
                                                 "-k",
                                                 data.keyfile,
                                                 "-s",
                                                 `${data.key_offset}`,
                                                 "-m",
                                                 data.map_name,
                                                 "-u",
                                                 data.uuid,
                                                 "-p",
                                                 `${data.payload}`
                                             ]
                                         };
                                         disks.cryptsetup.CommandDialog({
                                             command: cmd,
                                             title: '格式化中',
                                             onEnd: onEnd
                                         });
                                     }
                                 });
            };
            let close = ()=> {
            };
            let schema = {
                //...Config_Schema,
                "definitions": {
                    "cryptsetup_format": {
                        "type": "object",
                        "title": "配置",
                        "properties": {
                            "auto_open": {
                                "type": "boolean",
                                "default": true,
                                "title": "自动打开"
                            },
                            "path": {
                                "type": "string",
                            },
                            "keyfile": {
                                "type": "string",
                                "title": "keyfile",
                                "default": ""
                            },
                            "map_name": {
                                "type": "string",
                                "title": "map_name",
                                "default": ""
                            },
                            "key_offset": {
                                "type": "integer",
                                "title": "key_offset",
                                "default": 0
                            },
                            "uuid": {
                                "type": "string",
                                "title": "uuid",
                                "default": ""
                            },
                            "payload": {
                                "type": "string",
                                "title": "payload",
                                "default": "10G"
                            }
                        },
                        "required": [
                            "auto_open",
                            "path",
                            "keyfile",
                            "map_name",
                            "key_offset",
                            "uuid",
                            "payload"
                        ]
                    },
                },
                "$ref": `#/definitions/cryptsetup_format`
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
        async open(row) {
            let config = await disks.cryptsetup.get_config();
            if(config&&config.children) {
                let cur = row;//row.children.length==1?row.children[0]:row;
                let f = config.children.filter(v=>{
                    return disks.cryptsetup.check_match(v,cur);
                })[0];
                if(f) {
                    let p = {
                        command: "/app/scripts/cryptsetup_help.sh",
                        args: [
                            'open',
                               "-d",
                            `/dev/disk/${f.by}/${f[f.by]}`,
                               "-k",
                               f.keyfile,
                               "-s",
                            `${f.key_offset}`,
                               "-m",
                               f.map_name,
                               //"-u",
                               //f.uuid
                              ]
                    };
                    let ret = await api.run_command(p);
                    api.disk_info({});
                    return ret;
                }
                return {ret:-2};
            }
            return {ret:-2};
        },
        async close(row) {
            let config = await disks.cryptsetup.get_config();
            if(config&&config.children) {
                if(row.children) {
                    for(let cur of row.children){
                        if(cur.type != 'crypt') continue;
                        let f = config.children.filter(v=>`/dev/mapper/${v.map_name}` ==cur.path)[0];
                        if(f) {
                            let p = {
                                command: "/app/scripts/cryptsetup_help.sh",
                                args: [
                                    'close',
                                    "-d",
                                    f[f.by]||f.path,
                                    "-k",
                                    f.keyfile,
                                    "-s",
                                    `${f.key_offset}`,
                                    "-m",
                                    f.map_name,
                                    "-u",
                                    f.uuid
                                ]
                            };
                            let ret = await api.run_command(p);
                        } else {
                            //return {ret:-2};
                        }
                    }
                } else {
                    let cur = row;
                    if(cur.type == 'crypt') {
                        let f = config.children.filter(v=>`/dev/mapper/${v.map_name}` ==cur.path)[0];
                        if(f) {
                            let p = {
                                command: "/app/scripts/cryptsetup_help.sh",
                                args: [
                                    'close',
                                    "-d",
                                    f[f.by]||f.path,
                                    "-k",
                                    f.keyfile,
                                    "-s",
                                    `${f.key_offset}`,
                                    "-m",
                                    f.map_name,
                                    "-u",
                                    f.uuid
                                ]
                            };
                            let ret = await api.run_command(p);
                        } else {
                            //return {ret:-2};
                        }
                    }
                }
                console.log("ready get disk_info22");
                api.disk_info({});
                return {ret:0};
                //return {ret:-2};
            }
            return {ret:-2};
        }
    },
    RendDeviceTable(props) {
        /*
        let blockdevices = global_data.get('blockdevices', []).filter(v=>!v.ro);
        let self_data = make_watch_data({
            blockdevices,
            cryptsetup_devices:[]
        });
        */
        //console.log("blockdevices=", blockdevices);
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;
        let data = props.data;
        console.log("data===", data);

        let [state, update] = useState(0);
        useEffect(()=> {
            let w = data.watch("devices", ()=> {
                console.log("devices update===");
                update(prev=>prev+1);
            });
            return ()=> {
                data.unwatch("devices", w);
            };
        },[]);
        let RenderSize=({row})=> {
            return <>{row.fssize}/{row.size}({row['fsuse%']}%)</>;
        };
        let RendHealth=({row})=> {
            return disks.RendHealth(row);
        };
        let RendChildren=({row})=> {
            if(row.children&&row.children.length > 0) {
                return disks.RendDeviceChildren(row);
            }
            return <></>;
        };
        let RWStatus = ({row})=> {
            return disks.RendStats(row);
        };

        let LucksFormat = (row)=> {
            let id = 'dialog_'+Date.now();
            let config = {
            };
            let save = (data)=> {
                console.log("lucksformat save==", data);
                closeDialog(id);
                api.disk_info({});
            };
            openDialog({
                id,
                content: <disks.cryptsetup.Format data={row} schema="cryptsetup_format" id={id} onSave={save}/>
            });
        };

        let Rend_Luks = ({row})=> {
            if(row.fstype == 'crypto_LUKS') {
                if(row.children&&row.children.length > 0) {
                    let c = row.children.filter(v=>v.type == 'crypt')[0];
                    if(c) {
                        return <>
                            <RixButton className="button success" onClick={()=>disks.cryptsetup.close(row)}>关闭</RixButton>
                            <RixButton className="button alert" onClick={(e)=>disks.cryptsetup.remove(row)}>移除</RixButton>
                            </>;
                    }
                }
                return <>
                    <RixButton className="button success" onClick={(e)=>disks.cryptsetup.open(row)}>打开</RixButton>
                    <RixButton className="button alert" onClick={(e)=>disks.cryptsetup.remove(row)}>移除</RixButton>
                    </>;
            }
            else {
                if(!row.use_state) {
                return <RixButton className="button alert" onClick={(e)=>LucksFormat(row)}>加密使用</RixButton>;
                } else {
                    return <></>;
                }
            }
        };

        let Rend_Editor=({row})=> {
            if(row.ro) {
                return <></>;
            }
            if(row.type == 'loop') {
                return <Rend_Luks row={row}/>;
            }
            let format = <></>;
            if(row.use_state != 'using') {
                format = <RixButton className="button alert" onClick={(e)=>console(e,{row})}>分区&格式化</RixButton>;
            }
            return <>
                {format}
                <Rend_Luks row={row}/>
                </>;
        };

        let Rend_Type=({row})=> {
            if(row.type) {
                return <>{row.type}</>;
            }
            return <>{row.pttype}</>;
        };

        return <RixTable data={data.devices} pagination>
            <RixTable.TableColumn label="" type="expand">
            <RixTemplate slot-scope="{row}">
            <RendChildren/>
            </RixTemplate>
            </RixTable.TableColumn>
            <RixTable.TableColumn label="路径" prop="path"/>
            <RixTable.TableColumn label="设备" prop="model"/>
            <RixTable.TableColumn label="分区类型" >
            <RixTemplate slot-scope="{row}">
            <Rend_Type/>
            </RixTemplate>
            </RixTable.TableColumn>
            <RixTable.TableColumn label="容量" prop="size"></RixTable.TableColumn>
            <RixTable.TableColumn label="健康度(已消耗)" >
            <RixTemplate slot-scope="{row}">
            <RendHealth/>
            </RixTemplate>
            </RixTable.TableColumn>
            <RixTable.TableColumn label="读/写速度" >
            <RixTemplate slot-scope="{row}">
            <RWStatus />
            </RixTemplate>
            </RixTable.TableColumn>
            <RixTable.TableColumn label="挂载位置" prop="mountpoint"/>
            <RixTable.TableColumn label="编辑">
            <RixTemplate slot="header" slot-scope="scope">
            </RixTemplate>
            <RixTemplate slot-scope="{row}">
            <Rend_Editor/>
            </RixTemplate>
            </RixTable.TableColumn>
            </RixTable>;
    },
    check_using(v) {
        if(v.mountpoint) return true;
        if(v.children) {
            for(let one of v.children) {
                return disks.check_using(one);
            }
        }
        return false;
    },
    Render(props) {
        let blockdevices = global_data.get('blockdevices', []).filter(v=>!v.ro).map(v=> {
            let using = false;
            if(v.children) {
                for(let one of v.children) {
                    if(one.mountpoint) {
                        one.use_state = 'using';
                        using = true;
                    }
                }
            }
            if(using) {
                v.use_state = "using";
            }
            return v;
        });
        let self_data = make_watch_data({
            devices:blockdevices,
        });
        let [state, update] = useState(0);
        useEffect(()=> {
            disks.cryptsetup.get_config().then(res=> {
                let c = res.children;
                let out_list = [];
                c.forEach(v=> {
                    let f = blockdevices.filter(v2=> {
                        if(`/dev/mapper/${v.map_name}` == v2.path) {
                            v2.fstype = 'crypto_LUKS';
                            v2.use_state = 'using';
                            return true;
                        }
                        if(disks.cryptsetup.check_match(v, v2, false)) {
                            v2.fstype = 'crypto_LUKS';
                            v2.use_state = 'ready';
                            return true;
                        }
                        let v2_children = v2.children||[];
                        let v2_find = v2_children.filter(v3=> {
                            if(`/dev/mapper/${v.map_name}` == v3.path) {
                                v3.fstype = 'crypto_LUKS';
                                v3.use_state = 'using';
                                v2.use_state = 'using';
                                return true;
                            }
                            if(disks.cryptsetup.check_match(v, v3, true, (v4)=> {
                                v3.fstype = 'crypto_LUKS';
                                if(v4.path.startsWith('/dev/mapper/')) {
                                    v3.use_state = 'using';
                                } else {
                                    v3.use_state = 'ready';
                                }
                                v2.use_state = 'using';
                            })) {
                                //v3.fstype = 'crypto_LUKS';
                                return true;
                            }
                            return false;
                        })[0];
                        if(v2_find) {
                            return true;
                        }
                        return false;
                    })[0];
                    if(!f) {
                        out_list.push({
                            path: v.path,
                            type: "loop",
                            "model": "",
                            size:'',
                            mountpoint:'',
                            fstype: 'crypto_LUKS',
                            children:[]
                        });
                    }
                });
                if(true||out_list.length > 0) {
                    self_data.set('devices', [...blockdevices, ...out_list]);
                }
            });
            let blocks = global_data.watch('blockdevices', ()=> {
                update(prev=>prev+1);
            });
            return ()=> {
                global_data.unwatch(blocks);
            };
        });
        return <disks.RendDeviceTable data={self_data}/>;
    }
};

export default disks;
