import React, { useState, useEffect, useRef, useContext } from 'react';
import {
     Box, Typography, Button,
    Drawer,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    AppBar as MuiAppBar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Toolbar,
    IconButton,
} from '@mui/material';
import { styled } from '@mui/system';
import {
    Settings,
    Close, Restore,
    Menu,
    Home,
    ChevronLeft,
    Maximize, Minimize
} from '@mui/icons-material';
import { useData } from "../store/global_data.js";
//import api from '../api';
import BlockDevice from "./BlockDevice";
import Pool from './Pools';
import JsonEditorForm from './JsonEditorForm';
import bcachefs from '../utils/bcachefs';
const drawerWidth = 240;
const CustomDialogContent = styled(DialogContent)({
    width: '80%',
});
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => {
        let ret = {
        flexGrow: 1,
        padding: theme.spacing(3),
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        marginLeft: `-${drawerWidth}px`,
        ...(open && {
            transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: 0,
        }),
        };
        return ret;
    },
);

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: `${drawerWidth}px`,
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
}));


const StorageWindow = (props) => {
    const {global_data, api} = useData();
    const [state, setState] = useState({
        disks:[],
        pools:[],
        drawOpen: false,
        all_disk: true,
        show_pools: false,
        openAddDialog: false,
        schema:{},
        data: { id: 0, key: '', status: 0, type: 0, value: '', parent_id: 0 }
    });
    const { onActive, onClose, onRestore, onMaximize, onMinimize } = props;
    let update_state = (v)=> {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };
    useEffect(() => {
        let my_set_pool = (v) => {
            update_state({pools:v});
        };
        let my_set = (v) => {
            update_state({disks:v});
        };
        let v = global_data.get('pools', [], async () => {
            let read_ret = await api.config_file({ filename: 'config/pools.config', 'op': "get" });
            if (read_ret.ret == 0) {
                let pools = JSON.parse(read_ret.data);
                global_data.set('pools', pools);
            }
        });
        update_state({pools:v});
        api.disk_info({});
        global_data.watch('blockdevices', my_set);
        global_data.watch('pools', my_set_pool);
        return () => {
            global_data.unwatch('blockdevices', my_set);
            global_data.unwatch('pools', my_set_pool);
        };
    },[]);
    let onAdd = (row) => {
        let pool_names = state.pools.map(v => { return v.name; });
        update_state({
                openAddDialog: true,
                schema: {
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
                                    "enum": pool_names,
                                    "options": {
                                        "enum_titles": pool_names
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
                }
            });
    };
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
    const jsonEditorFormRef = useRef(null);
    let onSave = async () => {
        try {
            const config = jsonEditorFormRef.current.getValue();
            let pools = state.pools;
            switch (config.op) {
                case 'add_device_to_pool': {
                    console.log("add device to pool", config);
                    let pool_index = pools.findIndex(v => v.name == config.pool);
                    let pool = null;
                    if (pool_index >= 0)
                        pool = pools[pool_index];
                    let add_ret = await api.run_command({
                        ...bcachefs.device.add({
                            ...config,
                            mount_path: pool.mount_path
                        }),
                    });
                    if (add_ret.ret == 0) {
                        let index = pool.label.findIndex(v => v.path == config.device);
                        if (index >= 0) {
                            pool.label.splice(index, 1, { ...pool.label[index], name: config.label, path: config.device });
                        } else {
                            pool.label.push({ name: config.label, path: config.device });
                        }
                        let write_ret = await api.config_file({ filename: 'config/pools.config', 'op': "put", data: JSON.stringify(pools) });
                        if (write_ret.ret == 0) {
                            global_data.set('pools', pools);
                            update_state({openAddDialog:false});
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
                    if (format_ret.ret == 0) {
                        let name = config.name;
                        let cur_pools = pools;
                        let index = cur_pools.findIndex(v => v.name == name);
                        if (index >= 0) {
                            cur_pools.split(index, 1, config);
                        } else {
                            cur_pools.push(config);
                        }
                        global_data.set('pools', cur_pools);
                        let write_config_ret = await api.config_file({ op: 'put', filename: 'config/pools.config', data: JSON.stringify(cur_pools) });
                        if (write_config_ret.ret == 0) {
                            console.log("write_config ok=", write_config_ret);
                        }
                        if (config.auto_mount == true) {
                            let mount_ret = await api.run_command({
                                ...bcachefs.mount(config),
                                config,
                            });
                            console.log("mount_ret===", mount_ret);
                        }
                        update_state({ openAddDialog: false });
                    }
                }
                    break;
            }
        } catch (error) {
            console.error('Error saving parameter:', error);
        }
    };

    const RenderAddDialog = () => {
        let onClose = ()=> {
             update_state({openAddDialog: !state.openAddDialog });
        };
        return (
            <Dialog open={state.openAddDialog} onClose={onClose} fullWidth maxWidth="md">
                <DialogTitle>添加参数</DialogTitle>
                <CustomDialogContent>
                    <JsonEditorForm schema={state.schema} ref={jsonEditorFormRef}  />
                </CustomDialogContent>
                <DialogActions>
                    <Button onClick={onSave}>保存</Button>
                    <Button onClick={onClose}>取消</Button>
                </DialogActions>
            </Dialog>
        );
    };
    const add_pool = (e) => {
        e.preventDefault();
        update_state({
            openAddDialog: true,
            schema: {
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
            }
        });
    };

    return <><AppBar open={state.drawOpen} sx={{position:'relative'}}>
        <Toolbar
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
            }}
        >
            <IconButton edge="start" color="inherit" onClick={() => { update_state({drawOpen: !state.drawOpen }); }} sx={{ mr: 2, ...(state.drawOpen&& { display: 'none' }) }}>
            <Menu />
        </IconButton>
            <Typography variant="h6" component="div" sx={{
                flexGrow: 1,
                cursor: 'move',
            }}
                className="window-title"
                onClick={onActive}
            >
                存储设置
            </Typography>
            <IconButton color="inherit" onClick={onMinimize}>
                <Minimize />
            </IconButton>
            {props.isMaximized ? (
                <IconButton color="inherit" onClick={onRestore}>
                    <Restore />
                </IconButton>
            ) : (
                <IconButton color="inherit" onClick={onMaximize}>
                    <Maximize />
                </IconButton>
            )}
            <IconButton color="inherit" onClick={onClose}>
                <Close />
            </IconButton>
        </Toolbar>
    </AppBar>

        <Box p={2}
             sx={{display:'flex'}}
        >
          <Drawer anchor="left" open={state.drawOpen} onClose={()=>{}}
                  sx={{ width:drawerWidth,
                      flexShrink: 0,
                      '& .MuiDrawer-paper': {
                          width: drawerWidth,
                          boxSizing: 'border-box',
                      },
                      }}
            variant="persistent"
          >
                <DrawerHeader>
                    <IconButton onClick={() => { update_state({drawOpen: !state.drawOpen }); }}>
                        <ChevronLeft/>
                    </IconButton>
                </DrawerHeader>

                <Divider />
                <List>
                    <ListItem button onClick={() => { update_state({ all_disk: true, show_pools: false}); }}>
                        <ListItemIcon>
                            <Home/>
                        </ListItemIcon>
                        <ListItemText primary="所有磁盘" />
                    </ListItem>
                  <ListItem button onClick={()=>{update_state({ all_disk:false,show_pools: true});}}>
                        <ListItemIcon>
                            <Settings/>
                        </ListItemIcon>
                        <ListItemText primary="存储池" />
                    </ListItem>
                  <ListItem button onClick={add_pool}>
                        <ListItemIcon>
                            <Settings />
                        </ListItemIcon>
                        <ListItemText primary="添加池" />
                    </ListItem>

                </List>
    </Drawer>
          <Main open={state.drawOpen}>
            {state.show_pools &&
             <Rend_Pool/>
            }
            {state.all_disk &&
            <BlockDevice data={state.disks} onAdd={onAdd} check_add_status={check_add_status}/>
            }
            {state.openAddDialog &&
            <RenderAddDialog/>
            }

          </Main>
        </Box>
    </>;
};

export default StorageWindow;
