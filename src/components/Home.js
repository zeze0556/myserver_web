import React, { useState, useEffect, useRef,useContext } from 'react';
import api from '../api';
import JsonEditorForm from './JsonEditorForm';
import Pool from './Pools';
import { styled } from '@mui/system';
import { Table, Pagination, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, TableContainer,
         TableHead,
         TableRow,
         TableCell,
         TableBody,
         Paper,
         TablePagination,
         Modal
       } from '@mui/material';

import bcachefs from '../utils/bcachefs';
import {DataContext} from "../store/global_data.js";
import BlockDevice from "./BlockDevice";

const Home = ()=>{
    const [disks, set_disks] = useState([]);
    const [pools, setPools] = useState([]);
    const [data, setData] = useState({id:0,key:'',status:0,type:0,value:'', parent_id:0});
    const [loading, setLoading] = useState(true);
    const global_data = useContext(DataContext);
    const [schema, setSchema] = useState({});
    const [openAddDialog, setOpenAddDialog] = useState(false);
    useEffect(() => {
        let my_set = (v)=> {
            set_disks(v);
        };
        global_data.watch('blockdevices',my_set);
        let v = global_data.get('pools', [], async ()=> {
            let read_ret = await api.config_file({filename:'config/pools.config', 'op':"get"});
            if(read_ret.ret == 0) {
                let pools = JSON.parse(read_ret.data);
                setPools(pools);
                global_data.set('pools', pools);
            }
        });
        setPools(v);
        let my_set_pool = (v)=> {
            console.log("update pools=", v);
            setPools([...v]);
            console.log("after pools=", pools);
        };
        console.log("watch pools");
        global_data.watch('pools', my_set_pool);
        api.disk_info({});
        return () => {
            global_data.unwatch('blockdevices',my_set);
            console.log("unwatch pools");
            global_data.unwatch('pools', my_set_pool);
        };
    }, []);

    const jsonEditorFormRef = useRef(null);
    let obj = {};
    const add_pool = (e) => {
        e.preventDefault();
        let aschema = schema;
        setSchema({
        "$ref": "#/definitions/bcachefs_config",
        "definitions": {
            "bcachefs_label": {
                "type": "array",
                "title": "标签配置",
                "uniqueItems": true,
                "items": {
                    "type": "object",
                    "headerTemplate": "\{\{self.name\}\}=\{\{self.path\}\}",
                    "properties": {
                        "name": {
                            "type": "string",
                            "default": "",
                            "title": "label_name",
                        },
                        "path": {
                            "type": "string",
                            "format": "disk_select",
                            "title": "设备"
                        },
                        "model": {
                            "type": "string",
                            "title": "硬盘",
                            "options": {
                                "hidden": true
                            }
                        }
                    },
                    "required": ["name", "path", "model"]
                }
            },
            "bcachefs_config": {
                type: "object",
                properties: {
                    "op": {
                        "type": "string",
                        "default": "addpool",
                        "options": {
                            "hidden": true
                        }
                    },
                    "name": {
                        "type": "string",
                        "title": "名称",
                        "default": "pool"
                    },
                    compression: {
                        "type": "string",
                        "title": "压缩方式",
                        "enum": ["none", "lz4", "gzip", "zstd"],
                        "default": "none",
                        "options": {
                            "enum_titles": [
                                "none",
                                "lz4",
                                "gzip",
                                "zstd"
                            ]
                        }
                    },
                    "encrypted": {
                        "type": "boolean",
                        "title": "加密",
                        "default": false
                    },
                    "replicas": {
                        "type": "integer",
                        "title": "数据副本数量",
                        "default": 1
                    },
                    "foreground_target": {
                        "type": "string",
                        "title": "前端设备标签",
                        "default": ""
                    },
                    "promote_target": {
                        "type": "string",
                        "title": "promote_target设备标签",
                        "default": ""
                    },
                    "background_target": {
                        "type": "string",
                        "title": "后端设备标签",
                        "default": ""
                    },
                    "label": {
                        "title": "存储标签设置",
                        "$ref": "#/definitions/bcachefs_label"
                    },
                    "auto_mount": {
                        "type": "boolean",
                        "title": "自动挂载",
                        "default": false
                    },
                    "mount_path": {
                        "type": "string",
                        "title": "挂载路径",
                        "default": "/mnt"
                    }
                },
                required: [
                    //"possible_colors", "primary_color",
                    "op",
                    "name",
                    "compression", "encrypted", "replicas", "foreground_target", "promote_target", "background_target", "label", "auto_mount", "mount_path"]
            }
        }
    });
        setOpenAddDialog(true);
    };

    const handleCloseAddDialog = () => {
        setOpenAddDialog(false);
    };


    const handleSaveAddDialog = async () => {
        try {
            const config = jsonEditorFormRef.current.getValue();
            console.log("save===", config);
            switch(config.op) {
            case 'add_device_to_pool': {
                console.log("add device to pool", config);
                let pool_index = pools.findIndex(v=>v.name == config.pool);
                let pool = null;
                if(pool_index >= 0)
                    pool = pools[pool_index];
                let add_ret = await api.run_command({
                    ...bcachefs.device.add({...config,
                                            mount_path: pool.mount_path
                                           }),
                });
                if(add_ret.ret == 0) {
                    let index = pool.label.findIndex(v=>v.path == config.device);
                    if(index >= 0) {
                        pool.label.splice(index,1, {...pool.label[index],name:config.label, path: config.device});
                    } else {
                        pool.label.push({name: config.label, path: config.device});
                    }
                    let write_ret = await api.config_file({filename:'config/pools.config', 'op':"put", data: JSON.stringify(pools)});
                    if(write_ret.ret == 0) {
                        global_data.set('pools', pools);
                        setOpenAddDialog(false);
                    }
                }
            }
                break;
            case 'addpool': {
                let format_ret = await api.run_command({
                    ...bcachefs.format(config),
                    config
                });
                console.log("format_ret===", format_ret);
                if(format_ret.ret == 0) {
                    let name = config.name;
                    let cur_pools = pools;
                    let index = cur_pools.findIndex(v=>v.name == name);
                    if(index>=0) {
                        cur_pools.split(index, 1, config);
                    } else {
                        cur_pools.push(config);
                    }
                    global_data.set('pools', cur_pools);
                    let write_config_ret = await api.config_file({op:'put', filename:'config/pools.config', data: JSON.stringify(cur_pools)});
                    if(write_config_ret.ret == 0) {
                        console.log("write_config ok=", write_config_ret);
                    }
                    if(config.auto_mount == true) {
                        let mount_ret = await api.run_command({
                            ...bcachefs.mount(config),
                            config,
                        });
                        console.log("mount_ret===", mount_ret);
                    }
                }
            }
                break;
            }
        } catch (error) {
            console.error('Error saving parameter:', error);
        }
    };

    const CustomDialogContent = styled(DialogContent)({
        width: '80%',
    });
    const RenderAddDialog = () => {
        return (
            <Dialog open={openAddDialog} onClose={handleCloseAddDialog} fullWidth maxWidth="md">
              <DialogTitle>添加参数</DialogTitle>
              <CustomDialogContent>
                <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={data}/>
              </CustomDialogContent>
              <DialogActions>
                <Button onClick={handleSaveAddDialog}>保存</Button>
                <Button onClick={handleCloseAddDialog}>取消</Button>
              </DialogActions>
            </Dialog>
        );
    };

    const MyTest = ()=> {
        if(openAddDialog) {
            return <div>
            <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={data}/>
                   </div>;
        } else {
            return <></>;
        }
    };
    const test = async ()=> {
        let disk_config = await api.config_file({filename:'disk.config', op:'get'});
        console.log("disk_config==", disk_config);
        if(disk_config.ret == -2) {
            let d_w_ret = await api.config_file({filename:'disk.config', op:'put', data:JSON.stringify({
                blockdevices:global_data.get('blockdevices')
            })});
            console.log("d_w_ret=", d_w_ret);
        }
    };
    let onAdd = (row)=> {
        console.log("onAdd");
        let pool_names = pools.map(v=>{return v.name;});
        console.log("pools==", pool_names);
        setSchema({
            "$ref": "#/definitions/config",
            "definitions": {
                "config": {
                    "type": "object",
                    "title": "加入到池",
                    "properties": {
                        "op": {
                            "type": "string",
                            "default": "add_device_to_pool",
                            "options": {
                                "hidden": true
                            }
                        },
                        "device": {
                            "type": "string",
                            "default": row.path,
                            "options": {
                                "hidden": true
                            }
                        },
                        "pool": {
                            "type": "string",
                            "title": "池名字",
                            "enum":pool_names,
                            "options": {
                                "enum_titles":pool_names
                            }
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
                        "op",
                        "device",
                        "pool",
                        "label",
                        "fs_size",
                        "discard",
                        "bucket",
                    ]
                }
            }
        });
        setOpenAddDialog(true);
    };
    let check_add_status = (row)=> {
        for(let pool of pools) {
            let index = pool.label.findIndex(v=>v.path == row.path);
            if(index >= 0) return false;
        }
        return true;
    };
    let Rend_Pool = ()=> {
        let ret = [];
        for(let v of pools) {
            ret.push(<Pool data={v} key={v}/>);
        }
        return ret;
    };
    return (
        <div>
          <Button onClick={add_pool}>添加池</Button>
          <Button onClick={test}>test</Button>
          <RenderAddDialog/>
          <Rend_Pool/>
          <BlockDevice data={disks} onAdd={onAdd} check_add_status={check_add_status}/>
        </div>
    );
};

export default Home;
