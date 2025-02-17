import React, {forwardRef,useState, useEffect, useRef, useContext } from 'react';
import { js2xml, xml2js } from 'xml-js';
import {context_value} from "../store/global_data";
import cmd from "./command.js";
import Disks from "./disks";
import {WindowApi, useWindowManager} from "../rix/RixWindowManager";
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import JsonEditorForm from '../components/JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';

const {global_data, api, make_watch_data} = context_value;
const qemu = {
    command: "qemu-system",
    arch: "x86_64",
    async check_virt_manager() {
        let p = {
            command: "/app/scripts/install_virt_manager.sh",
            args: ["check"]
        };
        let res = await api.run_command(p);
        if(res.ret == 0) {
            if (res.data.stdout.includes("not installed")) {
                global_data.set('vm_service', 'not_installed');
            } else if (res.data.stdout.includes("not run")) {
                global_data.set('vm_service', 'stop');
            } else {
                global_data.set('vm_service', 'run');
            }
        }
    },
    install_virt_manager(callback={stdout:null, stderr:null, onerr:null, onend:null}) {
        cmd.long_cmd({
            "command": "/app/scripts/install_virt_manager.sh",
            args: ["install_virt_manager"],
        }, callback);
    },
    run_virt_manager(callback = { stdout: null, stderr: null, onerr: null, onend: null }) {
        cmd.long_cmd({
            "command": "/app/scripts/install_virt_manager.sh",
            args: ["run_virt_manager"],
        }, callback);
    },
    async check_x11_bridge() {
        let p = {
            command: "/app/scripts/install_x11_bridge.sh",
            args: ["check"]
        };
        return await api.run_command(p);
    },
    install_x11_bridge(callback = { stdout: null, stderr: null, onerr: null, onend: null }) {
        cmd.long_cmd({
            "command": "/app/scripts/install_x11_bridge.sh",
            args: ["install_x11_bridge"],
        }, callback);
    },
    run_x11_bridge(callback = { stdout: null, stderr: null, onerr: null, onend: null }) {
        cmd.long_cmd({
            "command": "/app/scripts/install_x11_bridge.sh",
            args: ["run_x11_bridge"],
        }, callback);
    },
    install(callback={stdout:null, stderr:null, onerr:null, onend:null}) {
        cmd.long_cmd({
            "command": "/app/scripts/install_qemu.sh",
            args: ["qemu"],
        }, callback);
    },
    StartVM_Manager(props) {
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
                terminal.current.open(shell_ref.current);
                qemu.run_virt_manager({
                    stdout: (out) => {
                        if (terminal.current)
                            terminal.current.write(out);
                        //set_container_up_message(container_up_message+out);
                    },
                    onend:()=> {
                        qemu.check_virt_manager();
                    }
                });
            });
            return <div ref={shell_ref} width="100%" height="100%" />;
        };
        return (
                <RixDialog id={props.id} fullWidth maxWidth="md">
                <div type="title">启动vm管理器</div>
                <div type="content" width="100%" height="100%">
                <Cmd />
                </div>
                </RixDialog>
        );
    },
    InstallVM_Manager(props) {
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
                terminal.current.open(shell_ref.current);
                qemu.install_virt_manager({
                    stdout: (out) => {
                        if (terminal.current)
                            terminal.current.write(out);
                        //set_container_up_message(container_up_message+out);
                    },
                    onend:()=> {
                        qemu.check_virt_manager();
                    }
                });
            });
            return <div ref={shell_ref} width="100%" height="100%" />;
        };
        return (
                <RixDialog id={props.id} fullWidth maxWidth="md">
                <div type="title">安装vm管理器</div>
                <div type="content" width="100%" height="100%">
                <Cmd />
                </div>
                </RixDialog>
        );
    },
    template: {
    },
    parse_address(address) {
        if(!address) return {};
        let ret = {
            "address": {
                "_attributes": {
                    "type": `${address.type}`,
                    "domain": "0x0000",
                    "bus": `${address.bus}`,
                    "port": address?.port || undefined,
                    "function": address?.['function'] || undefined,//`${address.function}`,
                    "multifunction": address?.multifunction|| undefined
                }
            }
        };
        return ret;
    },
    parse_usb(v) {
        let ret = {
            "controller": {
                "_attributes": {
                    "type": "usb",
                    "index": v?.index||"0",
                    "model": `${v.model}`
                },
                "alias": {
                    "_attributes": {
                        "name": v?.alias_name||`usb`
                    }
                },
                ...this.parse_address(v.address)
            }
        };
        if (v.master) {
            ret["controller"]["master"] = {
                "_attributes": {
                    "startport": `${v.master.startport}`
                }
            };
        }
        return ret;
    },
    parse_disk(v) {
        let ret = {
            "disk": {
                "_attributes": {
                    "type": "file",
                    "device": "disk"
                },
                "driver": {
                    "_attributes": {
                        "name": "qemu",
                        "type": `${v.type}`,
                        "cache": "writeback"
                    }
                },
                "source": {
                    "_attributes": {
                        "file": `${v.filename}`,
                        "index": `${v.boot_order}`
                    }
                },
                "backingStore": {
                },
                "target": {
                    "_attributes": {
                        "dev": "hdc",
                        "bus": `${v.bus_options}`
                    }
                },
                "boot": {
                    "_attributes": {
                        "order": `${v.boot_order}`
                    }
                },
                "alias": {
                    "_attributes": {
                        "name": "virtio_disk2"
                    }
                },
                ...this.parse_address(v?.address||{
                    "type": "pci",
                    "bus": "0x03",
                    "slot": "0x00",
                    "function": "0x0"
                })
            }
        };
        return ret;
    },
    parse_pci(v) {
        let ret = {
            "controller": {
                "_attributes": {
                    "type": `pci`,
                    "index": `${v.index}`,
                    "model": `${v.model}`
                },
                "alias": {
                    "_attributes": `${v.alias_name}`,
                },
                ...this.parse_address(v?.address||{})
                }
        };
        if(v.model_name) {
            ret['controller']["model"] = {
                "_attributes": {
                    "name": `${v.model_name}`
                }
            };
        }
        if(v.target) {
            let target = v.target;
            ret['controller']["target"] = {
                "_attributes": {
                    "classis": `${target.classis}`,
                    "port": `${target.port}`
                }
            };

        }
        return ret;
    },
    parse_network(v) {
        let ret = {
            "interface": {
                "_attributes": {
                    "type":v?.type||`bridge`
                },
                "mac": {
                    "_attributes": {
                        "address": `${v.mac}`
                    }
                },
                "source": {
                    "_attributes": {
                        "bridge": `${v.network}`
                    }
                },
                "target": {
                    "_attributes": {
                        "dev": `${v.target}`
                    }
                },
                "model": {
                    "_attributes": {
                        "type": `${v.model}`
                    }
                },
                "alias": {
                    "_attributes": {
                        "name": `${v.alias_name}`
                    }
                },
                ...this.parse_address(v.address)
            }
        };
        return ret;
    },
    parse_serial(v) {
        let ret= {
            "serial": {
                "_attributes": {
                    "type": `${v.type}`,
                    "tty": v?.tty||undefined
                },
                "source": {
                    "_attributes": {
                        "path": `${v.path}`
                    }
                },
                "target": {
                    "_attributes": {
                        "type": `${v.target_type}`,
                        "port": `${v.port}`
                    },
                    "model": {
                        "_attributes": {
                            "name": `${v.target_type}`
                        }
                    }
                },
                "alias": {
                    "_attributes": {
                        "name": `${v.alias_name}`
                    }
                }
            }
        };
        return ret;
    },
    parse_channel(v) {
        let ret = {
            'channel': {
                "_attributes": {
                    "type": "unix"
                },
                "source": {
                    "_attributes": {
                        "mode": "bind",
                        "path": `${v.path}`
                    }
                },
                "target": {
                    "_attributes": {
                        "type": "virtio",
                        "name": "org.qemu.guest_agent.0",
                        "state": "disconnected"
                    }
                },
                "alias": {
                    "_attributes": {
                        "name": "channel0"
                    }
                },
                ...this.parse_address(v.address)
            }
        };
        return ret;
    },
    parse_input(v) {
        let ret = {
            'input': {
                "_attributes": {
                    "type": `${v.type}`,
                    "bus": `${v.bus}`
                },
                "alias": {
                    "_attributes": {
                        "name": `${v.alias_name}`
                    }
                },
                ...this.parse_address(v.address)
            }
        };
        return ret;
    },
    parse_console(_v) {
        let ret = {
            "console": {
                "_attributes": {
                    "type": "pty",
                    "tty": "/dev/pts/2"
                },
                "source": {
                    "_attributes": {
                        "path": "/dev/pts/2"
                    }
                },
                "target": {
                    "_attributes": {
                        "type": "serial",
                        "port": 0
                    }
                },
                "alias": {
                    "_attributes": {
                        "name": "serial0"
                    }
                }
            }
        };
        return ret;
    },
    parse_config(config) {
        console.log("config===", config);
        let usbs = [{
            "model": "ich9-ehci1",
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slot": "0x07",
                "function": "0x0",
                "multifunction": "on"
            }
        },
        {
            "model": "ich9-uhci1",
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slot": "0x07",
                "function": "0x0",
            },
            "master": {
                "startport": 0
            }
        },
        {
            "model": "ich9-uhci2",
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slot": "0x07",
                "function": "0x1",
            },
            "master": {
                "startport": 2
            }
        },
        {
            "model": "ich9-uhci3",
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slot": "0x07",
                "function": "0x2",
            },
            "master": {
                "startport": 4
            }
        }
        ].map(v => {
            let ret = this.parse_usb(v);
            return ret;
        });
        let disks = config.disks.map(v=> {
            return this.parse_disk(v);
        });
        let cdrom = [{
            bus:0,
            target:0,
            unit:0,
            target_dev: "hda",
            ...config.cdrom
        }].map((v, index) => {
            let ret = {
                "disk": {
                    "_attributes": {
                        "type": "file",
                        "device": "cdrom"
                    },
                    "driver": {
                        "_attributes": {
                            "name": "qemu",
                            "type": "raw"
                        }
                    },
                    "source": {
                        "_attributes": {
                            "file": `${v.filename}`,
                            "index": `${index}`
                        }
                    },
                    "backingStore": {
                    },
                    "target": {
                        "_attributes": {
                            "dev": `${v.target_dev}`,
                            "bus": `${v.bus_options}`,
                            "tray": "open"
                        }
                    },
                    "readonly": {
                    },
                    "boot": {
                        "_attributes": {
                            "order": `${v.boot_order}`
                        }
                    },
                    "alias": {
                        "_attributes": {
                            "name": `${v.bus_options}${v.bus}-${v.target}-${v.unit}`
                        }
                    }
                }
            };
            return ret;
        });
        let sata=[{
            "type": "sata",
            "alias_name": "ide",
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slit": "0x1f",
                "function": "0x2"
            }
        }].map((v, index)=> {
            let ret = {
                "controller": {
                    "_attributes": {
                        "type": `${v.type}`,
                        "index": `${index}`
                    },
                    "alias": {
                        "_attributes": `${v.alias_name}`,
                    },
                    ...this.parse_address(v.address)
                }
            };
            return ret;
        });
        let pcis = [{
            "model": "pcie-root",
            "alias_name": "pcie.0"
        },
        {
            "model": "pcie-root-port",
            "model_name": "pcie-root-port",
            "alias_name": "pci.1",
            "target": {
                "chassis": "1",
                "port": "0x10"
            },
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slot": "0x02",
                "function": "0x0",
                "multifunction": "on"
            }
        },
        {
            "model": "pcie-root-port",
            "model_name": "pcie-root-port",
            "alias_name": "pci.2",
            "target": {
                "chassis": "2",
                "port": "0x11"
            },
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slot": "0x02",
                "function": "0x1",
            }
        },
        {
            "model": "pcie-root-port",
            "model_name": "pcie-root-port",
            "alias_name": "pci.3",
            "target": {
                "chassis": "3",
                "port": "0x12"
            },
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slot": "0x02",
                "function": "0x2",
            }
        },
        {
            "model": "pcie-root-port",
            "model_name": "pcie-root-port",
            "alias_name": "pci.4",
            "target": {
                "chassis": "4",
                "port": "0x13"
            },
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slot": "0x02",
                "function": "0x3",
            }
        },
        {
            "model": "pcie-root-port",
            "model_name": "pcie-root-port",
            "alias_name": "pci.5",
            "target": {
                "chassis": "5",
                "port": "0x14"
            },
            "address": {
                "type": "pci",
                "bus": "0x00",
                "slot": "0x02",
                "function": "0x4",
            }
        }
        ].map((v, index) => {
            return this.parse_pci({ ...v, index });
        });
        let nics = [...config.nic].map((v, _index)=>{
            return this.parse_network(v);
        });
        let serials = [{
            "type": "pty",
            "path": "/dev/pts/2",
            "alias_name": "serial0",
            "port": "0",
            "target_type": "isa-serial"
        },
            {
                "type": "pty",
                "path": "/dev/pts/2",
                "tty": "/dev/pts/2",
                "alias_name": "serial0",
                "port": "0",
                "target_type": "serial"
        }
                      ].map(v=> {
            return this.parse_serial(v);
        });
        let channels = [{
            "path": "org.qemu.guest_agent.0"
        }].map(v=> {
            return this.parse_channel(v);
        });
        let consoles = [{
        }].map(v=> {
            return this.parse_console(v);
        });
        let inputs = [{
            "type": "tablet",
            "bus": "usb",
            "alias_name": "input0",
            "address": {
                "type": "usb",
                "bus": "0",
                "port": "1"
            }
        },
        {
            "type": "mouse",
            "bus": "ps2",
            "alias_name": "input1"
        },
        {
            "type": "keyboard",
            "bus": "ps2",
            "alias_name": "input2"
        }
        ].map(v => {
            return this.parse_input(v);
        });
        let common = {
            ...this.template,
            "name": {
                "_text": `${config.name}`
            },
            "metadata": {
            },
            "memory": {
                "_attributes": {
                    "unit": "KiB"
                },
                "_text": `${config.memory*1024}`
            },
            "currentMemory": {
                "_attributes": {
                    "unit": "KiB"
                },
                "_text": `${config.memory*1024}`
            },
            "vcpu": {
                "_attributes": {
                    "placement": "static"
                },
                "_text": `${config.smp}`
            },
            "cputune": {
                "vcpuin": [{
                    "_attributes": {
                        "vcpu": `${0}`,
                        "cpuset": `${0}`
                    }
                }]
            },
            "os": {
                "type": {
                    "_attributes": {
                        "arch": "x86_64",
                        "machine": `${config.machine}`
                    },
                    "_text": "hvm"
                },
                "loader": {
                    "_attributes": {
                        "readonly": "yes",
                        "type": "pflash"
                    },
                    "_text": "/usr/share/qemu/ovmf-x64/OVMF_CODE-pure-efi.fd"
                },
                "nvram": {
                    "_text": "/etc/libvirt/qemu/nvram/99c36dce-e5af-5de4-b61f-17ea21137658_VARS-pure-efi.fd"
                }
            },
            "features": {
                "acpi":{},
                "apic":{},
            },
            "cpu": {
                "_attributes": {
                    "mode": 'host-passthrough',
                    "check": 'none',
                    migratable: 'on'
                },
                "topology": {
                    "_attributes": {
                        "sockets": "1",
                        "dies": "1",
                        "cores": "1",
                        "threads": "1"
                    }
                },
                "cache": {
                    "_attributes": {
                        "mode": "passthrough"
                    }
                }
            },
            "clock": {
                "_attributes": {
                    "offset": "utc"
                },
                "timer":[
                    {
                        "_attributes": {
                            "name": "rtc",
                            "tickpolicy":'catchup'
                        }
                    },
                    {
                        "_attributes": {
                            "name": "pit",
                            "tickpolicy": "delay"
                        }
                    },
                    {
                        "_attributes": {
                            "name": "hpet",
                            "tickpolicy": "no"
                        }
                    }
                ]
            },
            "on_poweroff": {
                "_text": "destroy"
            },
            "on_reboot": {
                "_text": "restart"
            },
            "on_crash": {
                "_text": "restart"
            },
            "devices": {
                "emulator": {
                    "_text": "/usr/local/sbin/qemu"
                },
                "disk": [
                    ...disks,
                ],
                "cdrom": [
                    ...cdrom
                ],
                ...usbs,
                ...sata,
                ...pcis,
                ...nics,
                ...serials,
                ...channels,
                ...consoles,
                ...inputs
            }
        };
        let ret = js2xml(common, { compact: true, ignoreComment: true, spaces: 4 });
        console.log("ret==", ret);
    },
    async update_kvm_conf(list) {
        await Disks.rm(`/app/token/kvm.conf`);
        let data = list.map(v=> {
            console.log("vnc==", v.vnc);
            let vnc = v.vnc.split(':')[1];
            return `${v.name}: 127.0.0.1:${5900+parseInt(vnc)}`;
        }).join('\n');
        await api.config_file({
            op: 'put',
            filename: `/app/token/kvm.conf`,
            data: data
        });
    },
    async list_running_vm() {
        let res = await api.run_command({
            "command": "virsh",
            "args": ['list', '--name', '--state-running']
        });
        if(res.ret == 0) {
            let vms = res.data.stdout.split('\n').filter(v=>v&&v.trim()!='');
            let vm_list = [];
            for(let vm of vms) {
                let res = await api.run_command({
                    "command": "virsh",
                    "args": ['vncdisplay', vm]
                });
                if(res.ret == 0) {
                    let vnc = res.data.stdout.trim();
                    vm_list.push({name: vm,
                                  vnc: vnc
                                 });
                }
            }
            await qemu.update_kvm_conf(vm_list);
            global_data.set("vm_list", vm_list);
        }
    }

};

export default qemu;
