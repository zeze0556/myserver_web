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

import qemu from "../utils/qemu";

import { useData } from "../store/global_data.js";
import JsonEditorForm from './JsonEditorForm';

import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import CommonWindow from './CommonWindow';

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
        qemu[props.data.op]({
            stdout:(out)=> {
                console.log("up_container=", out);
                if(terminal.current)
                    terminal.current.write(out);
                //set_container_up_message(container_up_message+out);
            },
            stderr:(err)=> {
                console.log("up_container stderr=", err);
            },
            onerr:(err)=> {
                console.log("up_container err=", err);
            },
            onend:()=> {
                if(props.onEnd)
                props.onEnd();
            }
        });
    },[props]);
    return (<Box ref={shell_ref} width="100vh" height="100vh"/>);
};

const VirtualMachine = (props) => {
    const { global_data, api } = useData();
    const [state, setState] = useState({
        //install_x11: false,
        install_virt_manager:false,
        run_virt_manager: false,
        //run_x11: false,
        install_dialog: false,
        drawOpen:false,
        run_cmd:{},
        openAddDialog: false,
        networks:[],
        json_editor_option: {
            disable_edit_json: true,
            disable_properties: true,
            disable_collapse: true,
            no_additional_properties: true,
            required_by_default: true,
        },
        schema:{
            "$ref": "#/definitions/qemu",
            "definitions": {
                "object": {
                    "type": "string",
                    "title": "Object",
                    "format": "json",
                    "default":"{}",
                    "options": {
                        "ace": {
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                            "wrap": true
                        }
                    }
                },
                "cdrom": {
                    "type": "object",
                    "title": "光盘设置",
                    "format": "grid",
                    "properties":{
                        "filename": {
                            "type": "string",
                            "default": "",
                            "title": "ISO文件路径"
                        },
                        "bus_options": {
                            "type": "string",
                            "default": "VirtIO",
                            "title": "总线类型",
                            "enum": ["VirtIO", "scsi", "sate", "ide", "usb"],
                            "options": {
                                "enum_titles": [
                                    "VirtIO", "scsi", "sate", "ide", "usb"
                                ]
                            }
                        },
                        "boot_order": {
                            "type": "integer",
                            "default": 2,
                            "title": "启动顺序"
                        }
                    },
                    "required": [
                        "filename",
                        "bus_options",
                        "boot_order"
                    ]
                },
                "disk": {
                    "type": "object",
                    "title": "磁盘",
                    "properties":{
                        "filename": {
                            "type": "string",
                            "default": "",
                            "title": "磁盘文件路径"
                        },
                        "size": {
                            "type": "string",
                            "default": "1G",
                            "title": "磁盘大小"
                        },
                        "type": {
                            "type": "string",
                            "default": "qcow2",
                            "title": "虚拟磁盘类型",
                            "enum": ["qcow2", "raw"],
                            "options": {
                                "enum_titles": [
                                    "qcow2",
                                    "raw"
                                ]
                            }
                        },
                        "bus_options": {
                            "type": "string",
                            "default": "VirtIO",
                            "title": "总线类型",
                            "enum": ["VirtIO", "scsi", "sate", "ide", "usb"],
                            "options": {
                                "enum_titles": [
                                    "VirtIO", "scsi", "sate", "ide", "usb"
                                ]
                            }
                        },
                        "boot_order": {
                            "type": "integer",
                            "default": 1,
                            "title": "启动顺序"
                        }
                    },
                    "required": [
                        "filename",
                        "size",
                        "type",
                        "bus_options",
                        "boot_order"
                    ]
                },
                "share": {
                    "type": "object",
                    "title": "共享",
                    "properties": {
                        "mode": {
                            "type": "string",
                            "default": "",
                            "title": "虚拟磁盘类型",
                            "enum": ["9p", "virtiofs"],
                            "options": {
                                "enum_titles": [
                                    "9p Mode",
                                    "Virtiofs Mode"
                                ]
                            }
                        },
                        "source": {
                            "type": "string",
                            "default": "",
                            "title": "主机目录"
                        },
                        "target": {
                            "type": "string",
                            "default": "",
                            "title": "虚拟机挂载标签"
                        }
                    },
                    "required": [
                        "mode",
                        "source",
                        "target"
                    ]
                },
                "gpu": {
                    "type": "object",
                    "title": "显卡",
                    "properties": {
                        "id": {
                            "type": "string",
                            "default": "virtual",
                            "title": "虚拟磁盘类型",
                            "enum": ["virtual"],
                            "options": {
                                "enum_titles": [
                                    "virtual"
                                ]
                            }
                        },
                        "source": {
                            "type": "string",
                            "default": "",
                            "title": "主机目录"
                        },
                        "target": {
                            "type": "string",
                            "default": "",
                            "title": "虚拟机挂载标签"
                        }
                    },
                    "required": [
                        "mode",
                        "source",
                        "target"
                    ]
                },
                "machine": {
                    "type": "string",
                    "title": "Machine",
                    "default": "pc-q35-7.1",
                    "enum": [
                        "pc-q35-7.1",
                        "pc-i440fx-6.2"
                    ],
                    "options": {
                        "enum_titles": [
                            "pc-q35-7.1",
                            "pc-i440fx-6.2"
                        ]
                    }
                },
                "overcommit": {
                    "type": "string",
                    "title": "overcommit",
                    "default": "mem-lock=off",
                    "options": {
                        "hidden": true,
                    }
                },
                "smp": {
                    "type": "string",
                    "title": "逻辑CPU",
                    "format": "vm_smp",
                    "default": "1,sockets=1,dies=1,cores=1,threads=1"
                },
                "chardev": {
                    "type": "string",
                    "title": "chardev",
                    "default": ""
                },
                "mon": {
                    "type": "string",
                    "title": "mon",
                    "default": ""
                },
                "global": {
                    "type": "string",
                    "title": "global",
                    "default": ""
                },
                "rtc": {
                    "type": "string",
                    "title": "rtc",
                    "default": ""
                },
                "boot": {
                    "type": "string",
                    "title": "boot",
                    "default": ""
                },
                "device": {
                    "type": "string",
                    "title": "device",
                    "format": "json",
                    "default": "{}",
                    "options": {
                        "ace": {
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                            "wrap": true
                        }
                    }
                },
                "netdev": {
                    "type": "string",
                    "title": "netdev",
                    "default": "",
                },
                "audiodev": {
                    "type": "string",
                    "format": "json",
                    "default": "{}",
                    "options": {
                        "ace": {
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                            "wrap": true
                        }
                    }
                },
                "vnc_auto_port": {
                    "type": "object",
                    "title": "自动",
                    "properties": {
                        "type": {
                            "type": "string",
                            "default": "auto_port",
                            "options": {
                                "hidden": true
                            }
                        },
                        "auto_port": {
                            "type": "boolean",
                            "default": true,
                            "options": {
                                "hidden": true
                            }
                        }
                    },
                    "required": [
                        "auto_port",
                        "type"
                    ]
                },
                "vnc_port": {
                    "type": "object",
                    "title": "手动",
                    "properties": {
                        "type": {
                            "type": "string",
                            "default": "port",
                            "options": {
                                "hidden": true
                            }
                        },
                        "port": {
                            "type": "integer",
                            "title": "监听端口",
                            "default": -1,
                        },
                        "ws_port": {
                            "type": "integer",
                            "title": "网页端口",
                            "default": -1,
                        }
                    },
                    "required": [
                        "port",
                        "ws_port",
                        "type",
                    ]
                },
                "vnc": {
                    "type": "object",
                    "title": "VNC",
                    //"format": "grid-strict",
                    "properties": {
                        "id": {
                            "type": "string",
                            "default": "virtual",
                            "options": {
                                "hidden": true
                            }
                        },
                        "protocol": {
                            "type": "string",
                            "default": "vnc",
                            "title": "VM Console Protocol:",
                            "enum": [
                                "vnc",
                                "spice"
                            ],
                            "options": {
                                "enum_titles": [
                                    "VNC",
                                    "SPICE"
                                ]
                            }
                        },
                        "port": {
                            "type": "object",
                            "title": "端口",
                            "anyOf": [
                                { "$ref": "#/definitions/vnc_auto_port" },
                                { "$ref": "#/definitions/vnc_port" }
                            ]
                        },
                        "model": {
                            "type": "string",
                            "title": "驱动模式",
                            "default": "qxl",
                            "enum": ["cirrus", "qxl", "vmvga"],
                            "options": {
                                "enum_titles": [
                                    "Cirrus",
                                    "QXL (best)",
                                    "vmvga"
                                ]
                            }
                        },
                        "keymap": {
                            "type": "string",
                            "title": "VNC键盘",
                            "default": "en-us"
                        },
                        "password": {
                            "type": "string",
                            "title": "VNC密码",
                            "default": ""
                        }
                    },
                    "required": ["id",
                        "protocol",
                        "port",
                        "model",
                        "keymap",
                        "password"
                    ]
                },
                "nic": {
                    "type": "object",
                    "title": "网卡",
                    "properties":{
                        "mac": {
                            "type": "string",
                            "title": "MAC地址",
                            "default": ""
                        },
                        "network": {
                            "type": "string",
                            "title": "source",
                            "default": ""
                        },
                        "model": {
                            "type": "string",
                            "title": "网络模式",
                            "default": "virtio-net",
                            "enum": ["virtio-net", "virtio", "e1000", "vmxnet3"],
                            "options": {
                                "enum_titles": ["virtio-net", "virtio", "e1000", "vmxnet3"],
                            }
                        },
                        "boot": {
                            "type": "integer",
                            "title": "启动顺序",
                            "default": 0
                        }
                    },
                    "required": [
                        "mac",
                        "network",
                        "model",
                        "boot"
                    ]
                },
                "sandbox": {
                    "type": "string",
                    "title": "sandbox",
                    "default": "on,obsolete=deny,elevateprivileges=deny,spawn=deny,resourcecontrol=deny"
                },
                "msg": {
                    "type": "string",
                    "title": "msg",
                    "default": "timestamp=on"
                },
                "qemu": {
                    "type": "object",
                    "title": "虚拟机配置",
                    "properties": {
                        "name": {
                            "type": "string",
                            "title": "名称",
                            "default": ""
                        },
                        /*
                        "debug_threads": {
                            "type": "string",
                            "title": "debug_threads",
                            "default": "on",
                            "enum": ["on", "off"],
                            "default": "on",
                            "options": {
                                "hidden": true,
                                "enum_titles": [
                                    "on",
                                    "off"
                                ]
                            }
                        },
                        "freeze_cpu_at_startup": {
                            "type": "boolean",
                            "title": "freeze CPU at startup",
                            "default": true,
                            "options": {
                                "hidden": true
                            }
                        },
                        "accel": {
                            "type": "string",
                            "title": "加速方式",
                            "default": "kvm",
                            "options": {
                                "hidden": true
                            }
                        },
                        */
                        "cpu":{
                            "type": "string",
                            "title": "cpu设置",
                            "enum": [
                                "host,migratable=on,host-cache-info=on,l3-cache=off",
                                "qemu64"
                            ],
                            "options": {
                                "enum_titles": [
                                    "主机直通",
                                    "qemu模拟"
                                ]
                            },
                            "default": "host,migratable=on,host-cache-info=on,l3-cache=off",
                        },
                        "smp": {
                            "$ref": "#/definitions/smp",
                        },
                        "memory": {
                            "type": "integer",
                            "title": "内存（MB）",
                            "default": 1024
                        },
                        "max_memory": {
                            "type": "integer",
                            "title": "最大内存（MB）",
                            "default": 1024
                        },
                        "machine": {
                            "$ref": "#/definitions/machine",
                        },
                        "bios": {
                            "type": "string",
                            "default": "OVMF",
                            "title": "bios选择",
                            "enum": ["SeaBIOS", "OVMF", "OVMF TPM"],
                            "options": {
                                "enum_titles": ["SeaBIOS", "OVMF", "OVMF TPM"]
                            }
                        },
                        "usbboot": {
                            "type": "boolean",
                            "default": false,
                            "title": "usb启动"
                        },
                        "usbmode": {
                            "type": "string",
                            "default": "usb2",
                            "enum": ["usb2", "usb3", "usb3-qemu"],
                            "options": {
                                "enum_titles": [
                                    "2.0 (EHCI)",
                                    "3.0 (nec XHCI)",
                                    "3.0 (qemu XHCI)"
                                ]
                            }
                        },
                        "cdrom": {
                            "$ref": "#/definitions/cdrom"
                        },
                        "disks": {
                            "type": "array",
                            "title": "磁盘配置",
                            "format": "table",
                            "items": {
                                "$ref": "#/definitions/disk",
                            }
                        },
                        "share": {
                            "type": "array",
                            "title": "共享配置",
                            "format": "table",
                            "items": {
                                "$ref": "#/definitions/share",
                            }
                        },
                        "gpu": {
                            "type": "array",
                            "title": "显卡配置",
                            "items": {
                                "type": "object",
                                "title": "显卡",
                                "anyOf": [
                                    {
                                        "$ref": "#/definitions/vnc",
                                    }]
                            }
                        },
                        "nic": {
                            "type": "array",
                            "title": "网路配置",
                            "items": {
                                "$ref": "#/definitions/nic"
                            }
                        },
                        /*"objects": {
                            "type": "array",
                            "title": "object",
                            "items": {
                                "$ref": "#/definitions/object",
                            }
                        },
                        "overcommit": {
                            "$ref": "#/definitions/overcommit",
                        },
                        */
                        "uuid": {
                            "type": "string",
                            "default": "",
                            "options": {
                                "hidden": true
                            }
                        },
                        /*
                        "no-user-config": {
                            "type": "boolean",
                            "title": "不加载默认用户配置",
                            "default": true,
                            "options": {
                                "hidden": true
                            }
                        },
                        "nodefaults": {
                            "type": "boolean",
                            "title": "不加载默认配置",
                            "default": true,
                            "options": {
                                "hidden": true
                            }
                        },
                        "chardev": {
                            "$ref": "#/definitions/chardev",
                        },
                        "mon": {
                            "$ref": "#/definitions/mon",
                        },
                        "global": {
                            "$ref": "#/definitions/global"
                        },
                        "rtc": {
                            "$ref": "#/definitions/rtc"
                        },
                        "no-hpet": {
                            "type": "boolean",
                            "title": "hpet",
                            default: false,
                            "options": {
                                "hidden": true
                            }
                        },
                        "no-shutdown": {
                            "type": "boolean",
                            "title": "shutdown",
                            default: false,
                            "options": {
                                "hidden": true
                            }
                        },
                        "boot": {
                            "$ref": "#/definitions/boot"
                        },
                        "devices": {
                            "$ref": "#/definitions/device"
                        },
                        "netdev": {
                            "$ref": "#/definitions/netdev"
                        },
                        "audiodev": {
                            "$ref": "#/definitions/audiodev"
                        },
                        "keyboard": {
                            "type": "string",
                            "title": "键盘布局",
                            "default": "en-us"
                        },
                        "sandbox": {
                            "$ref": "#/definitions/sandbox"
                        },
                        "msg": {
                            "$ref": "#/definitions/msg"
                        }*/
                    },
                    "required": [
                        "name",
                        "cpu",
                        //"debug_threads",
                        //"freeze_cpu_at_startup",
                        "smp",
                        "memory",
                        "max_memory",
                        "machine",
                        "bios",
                        "usbboot",
                        "usbmode",
                        "cdrom",
                        "disks",
                        "share",
                        "gpu",
                        "nic",
                        //"objects",
                        //"accel",
                        //"overcommit",
                        "uuid",
                        //"no-user-config",
                        //"nodefaults",
                        //"chardev",
                        //"mon",
                        //"global",
                        //"rtc",
                        //"no-hpet",
                        //"no-shutdown",
                        //"boot",
                        //"devices",
                        //"netdev",
                        //"audiodev",
                    ]
                }
            }
        },
    });

    let update_state = (v) => {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };

    let check= async()=> {
        let ret = await qemu.check_virt_manager();
        let install_virt_manager = false;
        let run_virt_manager=false;
        if(ret.ret == 0 && ret.data) {
            let stdout = ret.data.stdout;
            install_virt_manager = true;
            if (stdout == '') {
                install_virt_manager = true;
                let ret = await api.run_command({
                    command: "/bin/bash",
                    args: ["./scripts/get_ip.sh"]
                });
                if(ret.ret == 0) {
                    let data = JSON.parse(ret.data.stdout);
                    let networks = data.map(v=>{
                        v.ipv4 = v.ipv4.split(`\n`);
                        v.ipv6 = v.ipv6.split(`\n`);
                        return v;
                    });
                    run_virt_manager = true;
                    update_state({ install_virt_manager, run_virt_manager, networks });
                }

            } else {
                if (!stdout.includes("not installed")) {
                    install_virt_manager = true;
                    if (!stdout.includes("not run")) {
                        run_virt_manager = true;
                    }
                }
            }
        }
        /*
        ret = await qemu.check_x11_bridge();
        let install_x11 = false;
        let run_x11 = false;
        if (ret.ret == 0 && ret.data) {
            let stdout = ret.data.stdout;
            if(stdout == '') {
                install_x11 = true;
                run_x11 = true;
            } else {
                if (!stdout.includes("not installed")) {
                    install_x11 = true;
                    if (!stdout.includes("not run")) {
                        run_x11 = true;
                    }
                }
            }
        }
        console.log("run_x11===", run_x11, install_x11);
        update_state({install_virt_manager, install_x11, run_x11});
        */
        update_state({ install_virt_manager, run_virt_manager});
    };
    useEffect(() => {
        check();
    },[]);
    let install = ()=> {
        let run_command = {};
        console.log("state===", state);
        if(!state.install_virt_manager) {
            run_command = {op:'install_virt_manager'};
        } else if(!state.run_virt_manager) {
            run_command = { op: 'run_virt_manager' };
        }
        /*
        if (!state.install_x11) {
            run_command = { op: 'install_x11_bridge' };
        }
        if(state.install_virt_manager && state.install_x11 && !state.run_x11) {
            run_command = {op:'run_x11_bridge'};
        }*/
        if(!run_command.op) {
            update_state({ install_dialog: false});
        } else {
            update_state({install_dialog: true, run_command});
        }
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
        qemu.parse_config(config);
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
    let add_virtual = ()=> {
        update_state({openAddDialog:true});
    };
    const CustomDialogContent = styled(DialogContent)({
        width: '80%',
    });
    let location = window.location;
    //let virtual_url = `${location.protocol}://${location.hostname}:8185/`;
    //let virtual_url = `${location.protocol}://${location.hostname}/virt`;
    let virtual_url = '';
    if(state.networks.length > 0) {
        virtual_url = `http://${state.networks[0].ipv4[0]}:8185`;
    }
    console.log("state===", state, location);
    return <><CommonWindow title="虚拟机管理" {...props}>
        <Container>
            {(!state.install_virt_manager || !state.run_virt_manager) &&
                <Button onClick={install}>安装虚拟机管理</Button>
          }
            {(state.run_virt_manager) &&
          <iframe src={virtual_url} frameborder="0" style={{
                border: "0px",
                width: "100%",
                height:"100%",
                bottom:"0px",
                left: "0px",
                right: "0px",
                "top":"0px",
                "position": "fixed"
            }} allowfullscreen></iframe>
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
    </Container>
             </CommonWindow>
           </>;

    /*
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
                虚拟机管理
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
          {(!state.install_virt_manager||!state.run_virt_manager) &&
           <Button onClick={install}>安装虚拟机管理</Button>
          }
          {state.install_dialog &&
           <Dialog open={state.install_dialog} onClose={()=>console.log("close")}>
                    <DialogTitle>初始化</DialogTitle>
                    <CustomDialogContent>
                      <Install data={state.run_command} onEnd={check_install}/>
                    </CustomDialogContent>
                    <DialogActions>
                    </DialogActions>

           </Dialog>
          }
            
             {false &&
                <Drawer anchor="left" open={state.drawOpen} onClose={() => {}}
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            boxSizing: 'border-box',
                        },
                    }}
                    variant="persistent"
                >
                    <DrawerHeader>
                        <IconButton onClick={() => { update_state({ drawOpen: !state.drawOpen }); }}>
                            <ChevronLeft />
                        </IconButton>
                    </DrawerHeader>

                    <Divider />
                    <List>
                        <ListItem button onClick={() => { update_state({ all_disk: true, show_pools: false }); }}>
                            <ListItemIcon>
                                <Home />
                            </ListItemIcon>
                            <ListItemText primary="所有虚拟机" />
                        </ListItem>
                        <ListItem button onClick={add_virtual}>
                            <ListItemIcon>
                                <Settings />
                            </ListItemIcon>
                            <ListItemText primary="添加虚拟机" />
                        </ListItem>

                    </List>
                </Drawer>
             }
            <Container>
                    <iframe src="http://192.168.2.123:8185/" frameborder="0" style={{
                        border: "0px",
                        width: "100%"
                    }} allowfullscreen></iframe>

    </Container>
          {false&&
          <Main open={state.drawOpen}>
                {(state.run_virt_manager) &&
                 <div>
                    <iframe src="http://192.168.2.123:8185/" frameborder="0" style={{border:"0px",
                                                                  width:"100%"
                                                                 }} allowfullscreen></iframe>
                 </div>
            }
                {state.openAddDialog &&
                    <RenderAddDialog />
            }
          </Main>
          }
        </Box>
    </>;*/
};

export default VirtualMachine;
