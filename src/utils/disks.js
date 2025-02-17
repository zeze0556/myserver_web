import React, {forwardRef,useState, Fragment,useEffect, useRef, useContext } from 'react';
import {context_value} from "../store/global_data";

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
        let [state, setState] = useState({});
        useEffect(()=> {
            let w = global_data.watch('sysstat', (v)=> {
                let f = v.filter(disk=> path.startsWith('/dev/'+disk.Device))[0];
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
    RendHealth(props) {
        let path = props.path;
        let f = (global_data?.disks_health??[]).filter(disk=> path.startsWith(disk.device))[0];
        let [state, setState] = useState(f||{});
        useEffect(()=> {
            let w = global_data.watch('disks_health', (v)=> {
                let f = v.filter(disk=> path.startsWith(disk.device))[0];
                if(f) {
                    setState(f);
                }
            });
            return ()=>{
                global_data.unwatch('disks_health', w);
            };
        });
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
                if(f.children) {
                    let part = f.children.filter(d=>v.path == d.path)[0];
                    if(part) {
                        part.mountpoint = mount_path;
                        return;
                    }
                }
                if(f.path == v.path) {
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
    }
};

export default disks;
