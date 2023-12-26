import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    Box, Typography, Button,
    Drawer,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Container,
    AppBar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
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
import JsonEditorForm from './JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import CommonWindow from './CommonWindow';
import cmd from "../utils/command.js";
const drawerWidth = 240;


function parseSizeAndUnit(input) {
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
}
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

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
}));

const RenderError = (props) => {
    const { global_data, api } = useData();
    let onClose = () => {
        //update_state({ openAddDialog: !state.openAddDialog });
        global_data.set('alerts', []);
    };
    return (
        <Dialog open={true} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{props.title}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {props.content}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>关闭</Button>
            </DialogActions>
        </Dialog>
    );
};
const Install=(props)=> {
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
        const fitAddon = new FitAddon();
        terminal.current.loadAddon(fitAddon);
        terminal.current.onResize((size) => {
            // 调整 xterm 和 WebSocket 的窗口大小
            fitAddon.fit();
        });
        terminal.current.open(shell_ref.current);
        if(props.data == null) return;
        cmd.long_cmd(props.data, {
            stdout: (out) => {
                console.log("long_cmd=", out);
                if (terminal.current)
                    terminal.current.write(out);
                //set_container_up_message(container_up_message+out);
            },
            stderr: (err) => {
                console.log("up_container stderr=", err);
            },
            onerr: (err) => {
                console.log("up_container err=", err);
            },
            onend: () => {
                if (props.onEnd)
                    props.onEnd();
            }
        });
    },[props]);
    return (<Box ref={shell_ref} width="100vh" height="100vh"/>);
};

const Persistence = (props)=> {
    const jsonEditorFormRef = useRef(null);
    let schema = {
        "$ref": "#/definitions/persistence",
        "definitions": {
            "out_img": {
                "type": "object",
                "title": "外部镜像",
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "out_img",
                        "options": {
                            "hidden": true
                        }
                    },
                    "out_img": {
                        "type": "boolean",
                        "default": true,
                        "options": {
                            "hidden": true
                        }
                    },
                    "label": {
                        "type": "string",
                        "title": "标签"
                    },
                    "uuid": {
                        "type": "string",
                        "title": "UUID"
                    }
                },
                "required": [
                    "type",
                    "out_img",
                    "label",
                    "uuid"
                ]
            },
            "disk": {
                "type": "object",
                "title": "指定磁盘",
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "disk",
                        "options": {
                            "hidden": true
                        }
                    },
                    "disk": {
                        "type": "boolean",
                        "default": true,
                        "options": {
                            "hidden": true
                        }
                    },
                    "uuid": {
                        "type": "string",
                        "title": "UUID"
                    }
                },
                "required": [
                    "type",
                    "disk",
                    "uuid"
                ]
            },
            "pool_img": {
                "type": "object",
                "title": "磁盘镜像",
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "pool_img",
                        "options": {
                            "hidden": true
                        }
                    },
                    "pool_img": {
                        "type": "boolean",
                        "default": true,
                        "options": {
                            "hidden": true
                        }
                    },
                    "config": {
                        "type": "object",
                        "title": "配置",
                        "anyOf": [
                            {
                                "type": "object",
                                "title": "现有的镜像",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "default": "existed_img",
                                        "options": {
                                            "hidden": true
                                        }
                                    },
                                    "existed_img": {
                                        "type": "boolean",
                                        "default": true,
                                        "options": {
                                            "hidden": true
                                        }
                                    },
                                    "path": {
                                        "type": "string",
                                        "title": "路径"
                                    }
                                },
                                "required": [
                                    "type",
                                    "existed_img",
                                    "path"
                                ]
                            },
                            {
                                "type": "object",
                                "title": "新建镜像",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "default": "new_img",
                                        "options": {
                                            "hidden": true
                                        }
                                    },
                                    "new_img": {
                                        "type": "boolean",
                                        "default": true,
                                        "options": {
                                            "hidden": true
                                        }
                                    },
                                    "fs_type": {
                                        "type": "string",
                                        "title": "文件格式"
                                    },
                                    "fs_size": {
                                        "type": "string",
                                        "title": "文件大小"
                                    },
                                    "path": {
                                        "type": "string",
                                        "title": "路径"
                                    }
                                },
                                "required": [
                                    "type",
                                    "new_img",
                                    "fs_type",
                                    "fs_size",
                                    "path"
                                ]
                            }
                        ]
                    }
                },
                "required": [
                    "type",
                    "pool_img",
                    "config"
                ]
            },
            "pool_path": {
                "type": "object",
                "title": "指定目录",
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "pool_path",
                        "options": {
                            "hidden": true
                        }
                    },
                    "pool_path": {
                        "type": "boolean",
                        "default": true,
                        "options": {
                            "hidden": true
                        }
                    },
                    "path": {
                        "type": "string",
                        "title": "目录路径",
                    }
                },
                "required": [
                    "type",
                    "pool_path",
                    "path"
                ]
            },
            "pool": {
                "type": "object",
                "title": "指定存储池",
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "pool",
                        "options": {
                            "hidden": true
                        }
                    },
                    "pool": {
                        "type": "boolean",
                        "default": true,
                        "options": {
                            "hidden": true
                        }
                    },
                    "pool_name": {
                        "type": "string",
                        "title": "存储池名称"
                    },
                    "save": {
                        "type": "object",
                        "title": "保存位置",
                        "anyOf": [
                            { "$ref": "#/definitions/pool_img" },
                            { "$ref": "#/definitions/pool_path" },
                        ]
                    }
                },
                "required": [
                    "type",
                    "pool",
                    "pool_name",
                    "save"
                ]
            },
            "persistence": {
                "type": "object",
                "title": "数据持久化方式",
                "anyOf": [
                    {"$ref": "#/definitions/out_img"},
                    { "$ref": "#/definitions/disk" },
                    { "$ref": "#/definitions/pool" }
                ]
            }
        }
    };
    console.log("props===");
    return <Container>
             <JsonEditorForm schema={schema} ref={jsonEditorFormRef} {...props} />
           </Container>;
};

const DockerSeting= (props)=> {
    const { global_data, api } = useData();
    const jsonEditorFormRef = useRef(null);
    let [state, setState] = useState({
        pools:[],
        config:{}
    });
    let update_state = (v) => {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };

    let get_config = async() => {
        let read_ret = await api.config_file({ filename: 'config/docker.config', 'op': "get"});
        if(read_ret.ret == 0) {
            update_state({config:JSON.parse(read_ret.data)});
        }
    };

    let save_docker_config = async(config)=> {
        let write_ret = await api.config_file({ filename: 'config/docker.config', 'op': "put" , data: JSON.stringify(config)});
        if (write_ret.ret == 0) {
            update_state({ config: config });
        }
    };

    useEffect(() => {
        let my_set_pool = (v) => {
            update_state({ pools: v });
        };
        let v = global_data.get('pools', [], async () => {
            let read_ret = await api.config_file({ filename: 'config/pools.config', 'op': "get" });
            if (read_ret.ret == 0) {
                let pools = JSON.parse(read_ret.data);
                global_data.set('pools', pools);
            }
        });
        update_state({ pools: v });
        global_data.watch('pools', my_set_pool);
        get_config();
        return () => {
            global_data.unwatch('pools', my_set_pool);
        };
    },[]);
    let schema = {
        "$ref": "#/definitions/docker_config",
        "definitions": {
            "disk_path": {
                "type": "object",
                "title": "指定目录",
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "disk_path",
                        "options": {
                            "hidden": true
                        }
                    },
                    "disk_path": {
                        "type": "boolean",
                        "default": true,
                        "options": {
                            "hidden": true
                        }
                    },
                    "path": {
                        "type": "string",
                        "title": "目录",
                        "default": "/var/lib/docker"
                    }
                },
                "required": [
                    "type",
                    "disk_path",
                    "path"
                ]
            },
            "pool_img": {
                "type": "object",
                "title": "磁盘镜像",
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "pool_img",
                        "options": {
                            "hidden": true
                        }
                    },
                    "pool_img": {
                        "type": "boolean",
                        "default": true,
                        "options": {
                            "hidden": true
                        }
                    },
                    "config": {
                        "type": "object",
                        "title": "配置",
                        "anyOf": [
                            {
                                "type": "object",
                                "title": "现有的镜像",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "default": "existed_img",
                                        "options": {
                                            "hidden": true
                                        }
                                    },
                                    "existed_img": {
                                        "type": "boolean",
                                        "default": true,
                                        "options": {
                                            "hidden": true
                                        }
                                    },
                                    "path": {
                                        "type": "string",
                                        "title": "路径"
                                    }
                                },
                                "required": [
                                    "type",
                                    "existed_img",
                                    "path"
                                ]
                            },
                            {
                                "type": "object",
                                "title": "新建镜像",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "default": "new_img",
                                        "options": {
                                            "hidden": true
                                        }
                                    },
                                    "new_img": {
                                        "type": "boolean",
                                        "default": true,
                                        "options": {
                                            "hidden": true
                                        }
                                    },
                                    "fs_type": {
                                        "type": "string",
                                        "title": "文件格式",
                                        "default": "btrfs"
                                    },
                                    "fs_size": {
                                        "type": "string",
                                        "title": "文件大小",
                                        "default": "10G"
                                    },
                                    "path": {
                                        "type": "string",
                                        "title": "路径",
                                        "default": "docker.img"
                                    }
                                },
                                "required": [
                                    "type",
                                    "new_img",
                                    "fs_type",
                                    "fs_size",
                                    "path"
                                ]
                            }
                        ]
                    }
                },
                "required": [
                    "type",
                    "pool_img",
                    "config"
                ]
            },
            "pool_path": {
                "type": "object",
                "title": "指定目录",
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "pool_path",
                        "options": {
                            "hidden": true
                        }
                    },
                    "pool_path": {
                        "type": "boolean",
                        "default": true,
                        "options": {
                            "hidden": true
                        }
                    },
                    "path": {
                        "type": "string",
                        "title": "目录路径",
                    }
                },
                "required": [
                    "type",
                    "pool_path",
                    "path"
                ]
            },
            "pool": {
                "type": "object",
                "title": "指定存储池",
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "pool",
                        "options": {
                            "hidden": true
                        }
                    },
                    "pool": {
                        "type": "boolean",
                        "default": true,
                        "options": {
                            "hidden": true
                        }
                    },
                    "pool_name": {
                        "type": "string",
                        "format": "pool_select",
                        "title": "存储池名称",
                        "options": {
                            pools: state.pools
                        }
                    },
                    "save": {
                        "type": "object",
                        "title": "保存位置",
                        "anyOf": [
                            { "$ref": "#/definitions/pool_img" },
                            { "$ref": "#/definitions/pool_path" },
                        ]
                    }
                },
                "required": [
                    "type",
                    "pool",
                    "pool_name",
                    "save"
                ]
            },
            "save_path": {
                "type": "object",
                "title": "docker 存储配置",
                "anyOf": [
                    { "$ref": "#/definitions/disk_path" },
                    { "$ref": "#/definitions/pool" }
                ]
            },
            "docker_config": {
                "type": "object",
                "title": "docker 参数配置",
                "properties": {
                    "auto_start": {
                        "type": "boolean",
                        "title": "自动启动",
                    },
                    "save_config": {
                        "type": "object",
                        "title": "存储位置",
                        "anyOf": [
                            { "$ref": "#/definitions/disk_path" },
                            { "$ref": "#/definitions/pool" }
                        ]
                    },
                    "mirror": {
                        "type": "array",
                        "title": "加速镜像",
                        "items": {
                            "type": "string"
                        }
                    },
                    /*"log": {
                        "type": "object",
                        "title": "日志配置",
                        "default": {}
                    }*/
                },
                "required": [
                    "auto_start",
                    "save_config",
                    "mirror",
                    //"log"
                ]
            }
        }
    };
    console.log("props===", props, state);
    let save = async ()=> {
        let data = jsonEditorFormRef.current.getValue();
        console.log("data==", data);
        let {save_config} = data;
        switch(save_config.type) {
        case 'disk_path': {
                save_docker_config(data);
        }
            break;
            case 'pool': {
                let { save, pool_name } = save_config;
                console.log("pool_name=", pool_name);
                if(save.type == 'pool_path') {
                    save_docker_config(data);
                } else if (save.type == 'pool_img') {
                    let config = save.config;
                    let pool = state.pools.filter(v=>v.name == pool_name)[0];
                    if(config.type == 'existed_img') {
                        save_docker_config(data);
                    } else if (config.type == 'new_img') {
                        let p = parseSizeAndUnit(config.fs_size);
                        console.log("p===", p);
                        let temp_cmd = `#/bin/bash
set -ex
cd ${pool.mount_path}
rm -rf ${config.path}
dd if=/dev/zero of=${config.path} bs=1${p.unit} count=${p.block}
freeloop=$(losetup -f)
losetup $freeloop "${config.path}"
mkfs -t ${config.fs_type} $freeloop
sync
losetup -d $freeloop
`;
                        let write_ret = await api.config_file({ filename: 'scripts/temp.sh', 'op': "put", data: temp_cmd });
                        if (write_ret.ret == 0) {
                            let MkDocker = () => {
                                let onClose = () => {
                                    global_data.set('alerts', []);
                                };
                                let Cmd = ()=> {
                                const terminal = useRef(null);
                                const shell_ref = useRef(null);
                                useEffect(() => {
                                    terminal.current = new Terminal({
                                        //rendererType: 'canvas',
                                        rows: 40,
                                        convertEol: true,
                                        scrollback: 10,
                                        disableStdin: false,
                                        cursorStyle: 'underline',
                                        cursorBlink: true
                                    });
                                    const fitAddon = new FitAddon();
                                    terminal.current.loadAddon(fitAddon);
                                    terminal.current.onResize((size) => {
                                        // 调整 xterm 和 WebSocket 的窗口大小
                                        fitAddon.fit();
                                    });
                                    terminal.current.open(shell_ref.current);
                                    cmd.long_cmd({
                                        "command": "/bin/bash",
                                        args: [`./scripts/temp.sh`]
                                    }, {
                                        stdout: (out) => {
                                            console.log("up_container=", out);
                                            if (terminal.current)
                                                terminal.current.write(out);
                                            //set_container_up_message(container_up_message+out);
                                        },
                                        stderr: (err) => {
                                            console.log("up_container stderr=", err);
                                        },
                                        onerr: (err) => {
                                            console.log("up_container err=", err);
                                        },
                                        onend: () => {
                                            save.config = {
                                                type:"existed_img",
                                                existed_img: true,
                                                path: config.path
                                            };
                                            console.log("save_config===", save_config, data);
                                            save_docker_config(data);
                                            //if (props.onClose)
                                            //    props.onClose();
                                        }
                                    });
                                }, []);
                                    return <Box ref={shell_ref} width="100vh" height="100vh" />;
                                };
                                return (
                                    <Dialog open={true} onClose={onClose} fullWidth maxWidth="md">
                                        <DialogTitle>格式化</DialogTitle>
                                        <CustomDialogContent>
                                            <Cmd/>
                                        </CustomDialogContent>
                                        <DialogActions>
                                            <Button onClick={onClose}>关闭</Button>
                                        </DialogActions>
                                    </Dialog>
                                );
                            };
                            global_data.set('alerts', [{
                                id: 'format',
                                content: <MkDocker />
                            }]);
                        } else {
                            global_data.set('alerts', [{
                                id: 'error',
                                content: <RenderError title="错误" content={write_ret.stderr} />
                            }]);
                        }
                    }
                } 
                break;
            }
        }
    };
    let start = async () => {
        let config = state.config;
        let onClose = () => {
            global_data.set('alerts', []);
        };
        if (true) {
            let StartDocker = () => {
                let Cmd = () => {
                    const terminal = useRef(null);
                    const shell_ref = useRef(null);
                    useEffect(() => {
                        terminal.current = new Terminal({
                            //rendererType: 'canvas',
                            rows: 40,
                            convertEol: true,
                            scrollback: 10,
                            disableStdin: false,
                            cursorStyle: 'underline',
                            cursorBlink: true
                        });
                        const fitAddon = new FitAddon();
                        terminal.current.loadAddon(fitAddon);
                        terminal.current.onResize((size) => {
                            // 调整 xterm 和 WebSocket 的窗口大小
                            fitAddon.fit();
                        });
                        console.log("terminal==", terminal, shell_ref);
                        terminal.current.open(shell_ref.current);
                        cmd.long_cmd({
                            "command": "/bin/bash",
                            args: [`./scripts/start_docker.sh`]
                        }, {
                            stdout: (out) => {
                                console.log("up_container=", out);
                                if (terminal.current)
                                    terminal.current.write(out);
                                //set_container_up_message(container_up_message+out);
                            },
                            stderr: (err) => {
                                console.log("up_container stderr=", err);
                            },
                            onerr: (err) => {
                                console.log("up_container err=", err);
                            },
                            onend: () => {
                                //if (props.onClose)
                                //    props.onClose();
                            }
                        });
                    }, []);
                    return <Box ref={shell_ref} width="100vh" height="100vh" />;
                };
                return (
                    <Dialog open={true} onClose={onClose} fullWidth maxWidth="md">
                        <DialogTitle>启动docker</DialogTitle>
                        <CustomDialogContent>
                            <Cmd />
                        </CustomDialogContent>
                        <DialogActions>
                            <Button onClick={onClose}>关闭</Button>
                        </DialogActions>
                    </Dialog>
                );
            };
            global_data.set('alerts', [{
                id: 'start_docker',
                content: <StartDocker />
            }]);
        } /*else {
            global_data.set('alerts', [{
                id: 'error',
                content: <RenderError title="错误" content={write_ret.stderr} />
            }]);
        }*/
    };
    return <Container>
             <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={state.config} {...props} />
             <Button onClick={save}>保存</Button>
             <Button onClick={start}>启动</Button>
           </Container>;
};
const SystemSetting = (props) => {
    const { global_data, api } = useData();
    const [state, setState] = useState({
        drawOpen:false,
        run_cmd:{},
        openAddDialog: false,
        docker_config:'',
        all_config:{},
        cur_menu: 'docker',
        json_editor_option: {
            disable_edit_json: true,
            disable_properties: true,
            disable_collapse: true,
            no_additional_properties: true,
            required_by_default: true,
            keep_oneof_values:false,
        },
        schema:{},
    });

    let update_state = (v) => {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };

    let check= async()=> {
    };
    useEffect(() => {
        check();
    },[]);
    let install = ()=> {
    };
    let check_install = ()=> {
        update_state({ install_dialog: false});
        setTimeout(async()=> {
            await check();
            setTimeout(()=> {
                install();
            });
        });
    };
    const { onActive, onClose, onRestore, onMaximize, onMinimize } = props;
    const jsonEditorFormRef = useRef(null);

    let onSave=(e)=> {
        let config =jsonEditorFormRef.current.getValue();
        console.log("config==", config);
    };
    const RenderAddDialog = () => {
        let onClose = () => {
            update_state({ openAddDialog: !state.openAddDialog });
        };
        return (
            <Dialog open={state.openAddDialog} onClose={onClose} fullWidth maxWidth="md">
                <DialogTitle>添加参数</DialogTitle>
                <CustomDialogContent>
                  <JsonEditorForm schema={state.schema} ref={jsonEditorFormRef} options={state.json_editor_option}/>
                </CustomDialogContent>
                <DialogActions>
                    <Button onClick={onSave}>保存</Button>
                    <Button onClick={onClose}>取消</Button>
                </DialogActions>
            </Dialog>
        );
    };
    const CustomDialogContent = styled(DialogContent)({
        width: '80%',
    });
    return <><AppBar open={state.drawOpen} sx={{ position: 'relative' }}>
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
                系统设置
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
                  {false &&
                  <ListItem button onClick={() => { update_state({ cur_menu:'persistence'}); }}>
                        <ListItemIcon>
                            <Home />
                        </ListItemIcon>
                        <ListItemText primary="持久化" />
                    </ListItem>
                  }
                  <ListItem button onClick={() => { update_state({cur_menu:"docker"}); }}>
                        <ListItemIcon>
                            <Home/>
                        </ListItemIcon>
                        <ListItemText primary="docker" />
                    </ListItem>
                  <ListItem button onClick={()=>{update_state({ all_disk:false,show_pools: true});}}>
                        <ListItemIcon>
                            <Settings/>
                        </ListItemIcon>
                        <ListItemText primary="共享" />
                    </ListItem>
                  <ListItem button onClick={()=>{console.log("click");}}>
                        <ListItemIcon>
                            <Settings />
                        </ListItemIcon>
                        <ListItemText primary="虚拟机" />
                    </ListItem>

                </List>
    </Drawer>
          <Main open={state.drawOpen}>
            {(state.cur_menu == 'persistence') &&
             <Persistence options={state.json_editor_option}/>
            }
            {(state.cur_menu == 'docker') &&
                    <DockerSeting options={state.json_editor_option} />
            }
            {state.install_dialog &&
                <Dialog open={state.install_dialog} onClose={() => console.log("close")}>
                    <DialogTitle>初始化</DialogTitle>
                    <CustomDialogContent>
                        <Install data={state.run_command} onEnd={check_install} />
                    </CustomDialogContent>
                    <DialogActions>
                    </DialogActions>

                </Dialog>
          }
    </Main>
             </Box>
           </>;

};

export default SystemSetting;
