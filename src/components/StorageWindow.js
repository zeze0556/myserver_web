import React, {forwardRef,useState, Fragment,useEffect, useRef, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RixWindow from "../rix/RixWindow";
import RixShortList from "../rix/RixShortList";
import RixSidebar from "../rix/RixAside";
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import RixPanel from "../rix/RixPanel";
import RixTable from "../rix/RixTable";
import RixTemplate from "../rix/RixTemplate";
import {useWindowManager} from "../rix/RixWindowManager";
import Config_Schema from "./config_schema.js";
import {context_value, useData, DataContext, rix_make_watch_data} from "../store/global_data.js";
//import api from '../api';
import BlockDevice from "./BlockDevice";
import Pool from './Pools';
import JsonEditorForm from './JsonEditorForm';
import Bcachefs from '../utils/bcachefs';
import btrfs from '../utils/btrfs';
import Disks from "../utils/disks";

const {global_data, api, make_watch_data} = context_value;

const AddDevice=(props)=> {
    let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
    let jsonEditorFormRef = useRef(null);
    let schema = {
        ...Config_Schema,
        "$ref": `#/definitions/${props.schema}`
    };
    let {global_data, api}= useContext(DataContext);
    let data = props.data;
    let config = {
        ...data,
    };
    let onsave = async ()=> {
        let value = jsonEditorFormRef.current.getValue();
        if(props.type != 'balance') {
            if(value.device != '') {
                if(await props.onSave(value)) {
                    closeDialog(props.id);
                }
            }
        }
        if(await props.onSave(value)) {
            closeDialog(props.id);
        }
    };
    let title = `添加硬盘到池`;
    if(props.type == 'replace') {
        title = `替换硬盘`;
    }
    return <RixDialog id={props.id}>
        <div type="title"></div>
        <div type="content">
        <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
        </div>
        <button type="action" className="button warning" onClick={onsave}>确定</button>
        <button type="action" className="button js-dialog-close">取消</button>
        </RixDialog>;
};

let filesystem_proc = {
    'btrfs': {
        "command": "btrfs",
        "args":['filesystem', 'show'],
        Rend(props) {
            let {data} = props;
            let self_data = rix_make_watch_data({...data,
                                                 status: 'ok',
                                                 info:'',
                                                });
            const {global_data, api} = useData();
            let disks_health = global_data.disks_health;
            {
            let pools = global_data.pools || [];
            let index = pools.findIndex(v=>v.uuid == data.uuid);
            if(index>=0) {
                self_data.set('name', pools[index].name);
            }
            }
            let update_info=()=> {
                btrfs.info(self_data.mount_path).then(async(res)=>{
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
                            let info = await btrfs.info(self_data.mount_path);
                            console.log("old_pool data=", pool, "newinfo==", info);
                            global_data.pools.splice(index, 1, {...pool,
                                                                ...info});
                            global_data.update('pools');
                            self_data.set('name', pool.name);
                        }
                        self_data.set("devices", res.devices);
                    } else {
                        self_data.set("devices", null);
                    }
                });
            };
            let balance_status = ()=> {
                let balance_timer = setTimeout(async ()=> {
                    clearTimeout(balance_timer);
                    let c = await api.run_command(btrfs.balance.status({
                        mount_path: self_data.mount_path
                    }));
                    if(c.ret >= 0) {
                        if(c.data.stdout.indexOf('No balance')>=0) {
                            self_data.set("status", "ok");
                            self_data.set('info', '');
                            update_info();
                            return;
                        } else {
                            self_data.set('info', c.data.stdout);
                        }
                    }
                    balance_status();
                }, 10000);
                self_data.set('balance_timer', balance_timer);
            };
            let replace_status = ()=> {
                let replace_timer = setTimeout(async ()=> {
                    clearTimeout(replace_timer);
                    let c = await api.run_command(btrfs.device.replace.status({
                        mount_path: self_data.mount_path
                    }));
                    if(c.ret >= 0) {
                        if(c.data.stdout.indexOf('finished on')>=0) {
                            self_data.set("status", "ok");
                            self_data.set('info', '');
                            update_info();
                            return;
                        } else {
                            self_data.set('info', c.data.stdout);
                        }
                    }
                    replace_status();
                }, 1000);
                self_data.set('replace_timer', replace_timer);
            };
            let remove_status = ()=> {
                let remove_timer = setTimeout(async ()=> {
                    clearTimeout(remove_timer);
                    let c = await api.run_command(btrfs.device.remove_status({
                        mount_path: self_data.mount_path
                    }));
                    if(c.ret >= 0) {
                        if(c.data.stdout.trim()=="") {
                            self_data.set("status", "ok");
                            self_data.set('info', '');
                            update_info();
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
                update_info();
                api.run_command(btrfs.balance.status({
                    mount_path: self_data.mount_path
                })).then(res=> {
                    if(res.ret >= 0) {
                        if(res.data.stdout.indexOf('running') >= 0) {
                            balance_status();
                            self_data.set('info', res.data.stdout);
                            self_data.set("status", "balance");
                            //update(state+1);
                        }
                    }
                });
                api.run_command(btrfs.device.replace.status({
                    mount_path: self_data.mount_path
                })).then(res=>{
                    if(res.ret >= 0) {
                        if(res.data.stdout.indexOf('% done') >= 0) {
                            replace_status();
                            self_data.set('info', res.data.stdout);
                            self_data.set("status", "replacing");
                        }
                    }
                });
                api.run_command(btrfs.device.remove_status({
                    mount_path: self_data.mount_path
                })).then(res=>{
                    if(res.ret >= 0) {
                        if(res.data.stdout.trim()!= "") {
                            remove_status();
                            self_data.set('info', res.data.stdout);
                            self_data.set("status", "remove");
                        }
                    }
                });
                let w = global_data.watch('pools', ()=> {
                    let f = global_data.pools.filter(v=>v.uuid == self_data.uuid)[0];
                    if(f) {
                        if(self_data.name != f.name) {
                            self_data.set('name', f.name);
                        }
                        if(self_data.mount_path != f.mount_path) {
                            self_data.set('mount_path', f.mount_path);
                        }
                    }
                });
                return ()=> {
                    if(self_data.balance_timer) {
                        clearTimeout(self_data.balance_timer);
                        self_data.set('balance_timer', null);
                    }
                    if(self_data.replace_timer) {
                        clearTimeout(self_data.replace_timer);
                        self_data.set('replace_timer', null);
                    }
                    if(self_data.remove_timer) {
                        clearTimeout(self_data.remove_timer);
                        self_data.set('remove_timer', null);
                    }
                    global_data.unwatch('pools', w);
                };
            });
            let Rend_S = ()=> {
                let [state, update]= useState(0);
                let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
                let Title = ()=> {
                    let [state, update] = useState(0);
                    useEffect(()=> {
                        let w= self_data.watch('name', ()=> {
                            update(state+1);
                        });
                        let d= self_data.watch('devices', ()=> {
                            update(state+1);
                        });
                        return ()=> {
                            self_data.unwatch('name', w);
                            self_data.unwatch('devices', d);
                        };
                    });
                    let str = '';
                    if(self_data.name) {
                        str = `${self_data.name} 挂载位置:${self_data.mount_path}`;
                    } else {
                        str = `挂载位置:${self_data.mount_path} 分区类型:${self_data.type}`;
                    }
                    if(!self_data.devices) {
                        str += `（未挂载）`;
                    }
                    return str;
                };
                /*
                useEffect(()=> {
                    let w = global_data.watch("pools",(v)=> {
                        update(state+1);
                    });
                    return ()=> {
                        global_data.unwatch('pools', w);
                    };
                });
                */
                let remove = async (e,{row})=> {
                    let temp_cmd = `#/bin/bash
nohup btrfs device remove ${row.devid} ${self_data.mount_path} &> /dev/null &
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
                            update(state+1);
                        });
                        return ()=> {
                            self_data.unwatch('status', w);
                        };
                    });
                    if(self_data.status != 'ok') return <></>;
                    if(self_data.devices.length > 1) {
                        return <><RixButton className="button success" onClick={(e)=>remove(e,{row})}>移除</RixButton>
                            <RixButton className="button success" onClick={(e)=>replace(e,{row})}>替换</RixButton>
                            </>;
                    }
                    return <></>;
                };
                let AddPool =(props)=> {
                    let jsonEditorFormRef = useRef(null);
                    let data = props.data;
                    let config = {
                        type: data.type??'btrfs',
                        mount_path: data?.mount_path??'',
                        mount_option: data?.mount_option??'',
                        name: data?.name??'',
                        uuid: data?.uuid??'',
                        auto_mount: data?.auto_mount??false,
                    };
                    let save = ()=> {
                        let data = jsonEditorFormRef.current.getValue();
                        let pools = global_data.pools || [];
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
                            if(ret.ret == 0) {
                                closeDialog(props.id);
                                //mydialog.current.close();
                            }
                        });
                    };
                    let close = ()=> {
                    };
                    let schema = {
                        ...Config_Schema,
                        "$ref": `#/definitions/${props.schema}`
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
                let add_to_pool=()=> {
                    let id = 'dialog_'+Date.now();
                    openDialog({
                        id,
                        content: <AddPool data={data} schema='add_to_pool' id={id}/>
                    });
                };
                let add_device_to_pool=async (value)=> {
                    let add_ret = await api.run_command(btrfs.device.add({
                        device: value.device,
                        mount_path: value.mount_path
                    }));
                    if(add_ret.ret == 0) {
                        update_info();
                        return true;
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
                        content: <AddDevice data={config} schema="pool_add_device" id={id} onSave={add_device_to_pool}/>
                    });
                };
                let balance_start = async(value)=> {
                    let ret = await api.run_command(btrfs.balance.start({mount_path:self_data.mount_path,
                                                                         data_convert: value.data_convert
                                                                        }));
                    if(ret.ret == 0) {
                        self_data.set("status", "balance");
                        //update_pool();
                        balance_status();
                        return true;
                    }
                    return false;
                };
                let balance_config = ()=> {
                    let id = 'dialog_'+Date.now();
                    let config = {
                        uuid: self_data.uuid,
                        mount_path: self_data.mount_path,
                    };
                    openDialog({
                        id,
                        content: <AddDevice data={config} schema="btrfs_balance" id={id} onSave={balance_start} type="balance"/>
                    });

                };
                let replace_device =async (value)=> {
                    if(value.target_device == '') return false;
                    let source = self_data.devices.filter(v=>v.path == value.device)[0];
                    if(source == null) return false;
                    let add_ret = await api.run_command(btrfs.device.replace.start({
                        device: source.devid,
                        target_device: value.target_device,
                        mount_path: value.mount_path
                    }));
                    if(add_ret.ret == 0) {
                        self_data.set("status", "replacing");
                        replace_status();
                        return true;
                    }
                    return false;
                };
                let replace = (e,{row})=> {
                    let id = 'dialog_'+Date.now();
                    let config= {
                        uuid: self_data.uuid,
                        mount_path: self_data.mount_path,
                        device: row.path,
                    };
                    openDialog({
                        id,
                        content: <AddDevice data={config} schema="pool_replace_device" id={id} onSave={replace_device}/>
                    });

                };
                let modify = (data)=> {
                    let id = 'dialog_'+Date.now();
                    openDialog({
                        id,
                        content: <AddPool data={data} schema='modify_pool' id={id}/>
                    });
                };
                let Register = ()=> {
                    let pools = global_data.pools || [];
                    let index = pools.findIndex(v=>v.uuid == data.uuid);
                    if(index>=0) {
                        return <></>;
                    }
                    return <RixButton className="button success" onClick={add_to_pool}>注册</RixButton>;
                };
                let Modify = ()=> {
                    let pools = global_data.pools || [];
                    let index = pools.findIndex(v=>v.uuid == data.uuid);
                    if(index>=0) {
                        let click = ()=> {
                            modify(pools[index]);
                        };
                        return <RixButton className="button success" onClick={click}>修改</RixButton>;
                    }
                    return <></>;
                };
                let Balance = ()=> {
                    let [state, update] = useState(0);
                    useEffect(()=> {
                        let w = self_data.watch('status', ()=> {
                            update(state+1);
                        });
                        let d = self_data.watch('devices', ()=> {
                            update(state+1);
                        });
                        return ()=> {
                            self_data.unwatch('status', w);
                            self_data.unwatch('devices', w);
                        };
                    });
                    if(self_data.devices&&self_data.status == 'ok') {
                        return <RixButton className="button success" onClick={balance_config}>均衡</RixButton>;
                    }
                    return <></>;
                };
                let AddDeviceButton = ()=> {
                    let [state, update] = useState(0);
                    useEffect(()=> {
                        let w = self_data.watch('status', ()=> {
                            update(state+1);
                        });
                        let d = self_data.watch('devices', ()=> {
                            update(state+1);
                        });
                        return ()=> {
                            self_data.unwatch('state', w);
                            self_data.unwatch('devices', w);
                        };
                    });
                    if(self_data.devices&&self_data.status == 'ok') {
                        return <RixButton className="button success" onClick={add_device}>添加</RixButton>;
                    }
                    return <></>;
                };
                let Info = ()=> {
                    let [state, update] = useState(0);
                    useEffect(()=> {
                        let w = self_data.watch('info', ()=> {
                            update(state+1);
                        });
                        return ()=> {
                            self_data.unwatch('info', w);
                        };
                    });
                    if(self_data.info&&self_data.info != '') {
                        return <span>{self_data.info}</span>;
                    }
                    return <></>;
                };
                let umount = async()=> {
                    let ret = await btrfs.umount(self_data);
                    if(ret.ret == 0) {
                        self_data.set("devices", null);
                        self_data.set("state", "unmount");
                        update_info();
                    } else {
                        self_data.set("info", JSON.stringify(ret));
                    }
                };
                let mount = async()=> {
                    let ret = await btrfs.mount(self_data);
                    if(ret.ret == 0) {
                        self_data.set("state", "ok");
                        update_info();
                    } else {
                        self_data.set("info", JSON.stringify(ret));
                    }
                };
                let Mount = ()=> {
                    let [state, update] = useState(0);
                    useEffect(()=> {
                        let w = self_data.watch('status', ()=> {
                            update(state+1);
                        });
                        let d = self_data.watch('devices', ()=> {
                            update(state+1);
                        });
                        return ()=> {
                            self_data.unwatch('status', w);
                            self_data.unwatch('devices', w);
                        };
                    });
                    if(self_data.status == 'ok') {
                        if(self_data.devices) {
                            return <RixButton className="button success" onClick={umount}>卸载</RixButton>;
                        }
                        return <RixButton className="button success" onClick={mount}>挂载</RixButton>;
                    }
                    return <></>;

                };
                let RendDeviceTable=()=> {
                    let [state, update] = useState(0);
                    useEffect(()=> {
                        let w = self_data.watch('devices', ()=> {
                            update(state+1);
                        });
                        return ()=> {
                            self_data.unwatch('devices', w);
                        };
                    });
                    if(self_data.devices) {
                        return <RixTable data={self_data.devices}>
                        <RixTable.TableColumn label="devid" prop="devid">
                        </RixTable.TableColumn>
                        <RixTable.TableColumn label="path" prop="path">
                        </RixTable.TableColumn>
                        <RixTable.TableColumn label="已用" prop="used">
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
                let RendInfo = ()=>{
                    return <RixPanel collapsible >
                        <Title type='title'/>
                        <div type='icon' class='mif-apps'/>
                        <Register type="button" />
                        <Mount type="button" />
                        <AddDeviceButton type="button" />
                        <Modify type="button"/>
                        <Balance type="button"/>
                        <Info />
                        <RendDeviceTable/>
                         </RixPanel>;
                };
                return <RendInfo/>;
            };
            return <Rend_S/>;
        }
    },
    'bcachefs': {
        "command": "bcachefs",
        "args": ["fs", "usage", "-h"],
        Rend(props){
            let data = props.data;
            return <Bcachefs.Render data={data}>
                </Bcachefs.Render>;
        }
    }
};

let update_pools = async (global_data, api)=> {
    {
        let pools = global_data?.pools??[];
        for(let index = 0; index < pools.length; index++) {
            let one = pools[index];
            if(one.type == 'btrfs') {
                let info = btrfs.info(one.mount_path);
                if(info) {
                    let cur = {
                        ...one,
                        ...info
                    };
                    pools.splice(index, 1, cur);
                }
            }
            if(one.type == 'bcachefs') {
                let info = Bcachefs.info(one.mount_path);
                if(info) {
                    let cur = {
                        ...one,
                        ...info
                    };
                    pools.splice(index, 1, cur);
                }
            }
        }
        global_data.update('pools');
        global_data.update('blockdevices');
    }
    };

const AddPool = (props)=>{
    let jsonEditorFormRef = useRef(null);
    let schema = {
        ...Config_Schema,
        "$ref": `#/definitions/add_pool`
    };
    let config = {};
    let {closeDialog}= useWindowManager();
    let save = ()=> {
        let data = jsonEditorFormRef.current.getValue();
        let pools = global_data.pools || [];
        data.uuid = uuidv4();
        /*
        let index = pools.findIndex(v=>v.uuid == data.uuid);
        if(index>=0) {
            pools.splice(index, 1, data);
        } else
        */
        {
            pools.push(data);
        }
        console.log("pools=", pools);
        global_data.set('pools', pools);
        api.config_file({
            filename: '/app/config/pools.config',
            'op': 'put',
            data: JSON.stringify(pools)
        }).then(ret=> {
            if(ret.ret == 0) {
                closeDialog(props.id);
                //mydialog.current.close();
            }
        });

    };
    return <RixDialog id={props.id}>
        <div type="title">添加存储池</div>
        <div type="content">
        <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
        </div>
        <button type="action" className="button" onClick={save}>确定</button>
        <button type="action" className="button js-dialog-close">取消</button>
        </RixDialog>;
};

const StorageWindow = forwardRef((props, ref) => {
    const {global_data, api} = useData();
    let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
    const state = rix_make_watch_data({
        disks:[],
        //pools:[],
        drawOpen: false,
        all_disk: true,
        show_pools: false,
        openAddDialog: false,
        schema:{},
        scan_pool_list:[],
        update:0,
        //disks_health:[],
        data: { id: 0, key: '', status: 0, type: 0, value: '', parent_id: 0 }
    });
    let update_state = (obj)=> {
        for(let key in obj) {
            state.set(key, obj[key]);
        }
    };

    useEffect(() => {
        let my_set = (v) => {
            update_state({disks:v});
        };
        global_data.watch('blockdevices', my_set);
        return () => {
            global_data.unwatch('blockdevices', my_set);
        };
    },[]);
    let check_add_status = (row) => {
        for (let pool of state.pools) {
            let index = pool.label.findIndex(v => v.path == row.path);
            if (index >= 0) return false;
        }
        return true;
    };
    let Rend_Pool = () => {
        let ret = [];
        for (let v of state.pools) {
            ret.push(<Pool data={v} key={v} />);
        }
        return ret;
    };
    let add = ()=> {
        let id = 'dialog_'+Date.now();
        let test = ()=> {
            closeDialog(id);
        };
        openDialog({
            id,
            content: <AddPool id={id}/>
        });
    };
    let scan=async ()=> {
        let mount_info = await api.run_command({
            'command': 'mount',
            args:[]
        });
        let extractContentInParentheses=(str)=> {
            const regex = /\(([^)]+)\)/;
            const match = str.match(regex);
            if (match) {
                return match[1];
            }
            return null;
        };
        if(mount_info.ret == 0) {
            {
                let used = mount_info.data.stdout.split(`\n`).map(v=> {
                    let one = v.split(/\s+/);
                    if(one[0].startsWith('/dev/')) {
                        return {
                            mount_path: one[2],
                            type: one[4],
                            mount_option: extractContentInParentheses(one[5]),
                        };
                    }
                    return null;
                }).filter(v=>v);
                global_data.set('mounted_device', used);
            }
            let mount_list = mount_info.data.stdout.split(`\n`).map(v=> {
                let one = v.split(/\s+/);
                if(one[4] == 'btrfs'
                   || one[4] == 'bcachefs'
                  ) {
                    return {
                        mount_path: one[2],
                        type: one[4],
                        mount_option: extractContentInParentheses(one[5]),
                    };
                }
                return null;
            }).filter(v=>v);
            console.log("pool info=", mount_list);
            let pool_list = [];
            for(let one of mount_list) {
                if(one.type == 'btrfs') {
                    let info = await btrfs.info(one.mount_path);
                    if(info) {
                        console.log("global_data.pools=", global_data.pools, "cur=", info);
                        let f = global_data.pools.filter(v=>v.uuid == info.uuid)[0];
                        if(!f) {
                            pool_list.push({
                                ...one,
                                ...info
                            });
                        }
                    }
                }
                if(one.type == 'bcachefs') {
                    let info = await Bcachefs.info(one.mount_path);
                    if(info) {
                        console.log("global_data.pools=", global_data.pools, "cur=", info);
                        let f = global_data.pools.filter(v=>v.uuid == info.uuid)[0];
                        if(!f) {
                            pool_list.push({
                                ...one,
                                ...info
                            });
                        }
                    }
                }
            }
            console.log("scan_pool_list==", pool_list);
            update_state({scan_pool_list: pool_list});
        }
    };

    let CurShow=()=> {
        let [update, setupdate] = useState(0);
        let pools = [];
        useEffect(()=> {
            let w = state.watch('scan_pool_list', ()=> {
                if(update != global_data.pools.length+state.scan_pool_list.length) {
                    update = global_data.pools.length+state.scan_pool_list.length;
                    setupdate(update);
                }
                //setupdate(update+1);
            });
            let pools_update = global_data.watch('pools', (v)=> {
                if(update != v.length+state.scan_pool_list.length) {
                    update = v.length+state.scan_pool_list.length;
                    setupdate(update);
                }
            });
            return ()=> {
                state.unwatch(w);
                global_data.unwatch('pools', pools_update);
            };
        },[]);
        console.log("global_data==", global_data.pools, state.scan_pool_list);
        let pool_list = [...global_data.pools, ...state.scan_pool_list];//state.scan_pool_list;
        for(let pool of pool_list) {
            switch(pool.type) {
            case 'bcachefs1':
                pools.push(<div key={pool.uuid}><Bcachefs.Render data={pool} /></div>);
                break;
            default:
                let Rend = filesystem_proc[pool.type].Rend;
                pools.push(<div key={pool.uuid}><Rend data={pool} /></div>);
                break;
            }
        }
        return pools;
    };

    console.log("Render StroageWindow=", Date.now());

    return <RixWindow {...props} ref={ref}>
        <div style={{'height':'100%'}}>
        <RixButton className="button success" onClick={scan}>扫描</RixButton>
        <RixButton className="button success" onClick={add}>新增</RixButton>
        <CurShow/>
        </div>
    </RixWindow>;
});

export default StorageWindow;
