import Disks from "./disks";
import {context_value} from "../store/global_data";

const {global_data, api} = context_value;
const btrfs = {
    command: "btrfs",
    async umount(config) {
        let args = [];
        args.push(config.mount_path);
        return await api.run_command({
            command: "umount",
            args
        });
    },
    async mount(config) {
        await api.run_command({
            command: 'mkdir',
            args: ['-p', config.mount_path]
        });
        if(config.devices&&config.devices.length > 0) {
            //至少一个设备
            let ret = await api.run_command({
                "command": "mount",
                "args": [
                    config.devices[0].path,
                    config.mount_path
                ]
            });
            return ret;
        } else if(config.uuid) {
            //只有uuid
            let ret = await api.run_command({
                "command": "mount",
                "args": [
                    `UUID=${config.uuid}`,
                    config.mount_path
                ]
            });
            return ret;
        }
        return {ret:-2, data:{stdout: "not found devices"}};
    },
    async info(mount_path) {
        let ret = await api.run_command({command: "btrfs", args: ['filesystem', 'show', mount_path]});
        if(ret.ret == 0) {
            let info = this.parse_device(ret.data.stdout);
            Disks.update_blockdevice(info.devices, mount_path);
            return info;
        }
        return null;
    },
    'parse_device':(text)=> {
        const uuidMatch = text.match(/uuid:\s*([a-f0-9-]+)/i);
        const uuid = uuidMatch ? uuidMatch[1] : null;
        const deviceRegex = /\s*devid\s+(\d+)\s+size\s+([\d.]+[TGMK]iB|([\d.]+B))\s+used\s+([\d.]+[TGMK]iB|[\d.]+B)\s+path\s+(\/dev\/\w+)/;
        let devices = [];
        let match;
        let lines = text.split(`\n`);
        lines.forEach(text=> {
            const match = text.trim().match(deviceRegex);
            if(match){
                devices.push({
                    devid: match[1],
                    size: match[2],
                    used: match[4],
                    path: match[5],
                    health:0,
                });
            }
        });
        return {uuid: uuid,
                devices: devices
               };
    },
    filesystem: {
        show(path) {
            let args = [];
            args.push("filesystem");
            args.push("show");
            args.push(path);
            return {
                command: "btrfs",
                args
            };
        }
    },
    fs: {
        usage(path) {
            let args = [];
            args.push("filesystem");
            args.push("usage");
            args.push(path);
            return {
                command: "btrfs",
                args
            };
        }
    },
    balance: {
        start(config) {
            let args = ["balance", "start", "--background"];
            let data_convert = config?.data_convert??'no';
            if(data_convert != 'no') {
                args.push(`-dconvert=${data_convert}`);
            }
            args.push(config.mount_path);
            return {
                command: "btrfs",
                args
            };
        },
        status(config) {
            let args = ["balance", "status"];
            args.push(config.mount_path);
            return {
                command: "btrfs",
                args
            };
        }
    },
    device: {
        remove_status(config) {
            let str = `ps aux | grep ${config.mount_path} | grep remove | grep -v grep`;
            /*
            let args = ['ps', '|',  'grep', config.mount_path,  '|',
                        'grep' , 'remove', '|', 'grep', '-v', 'grep'];
                        */
            let args = ['-c', str];
            //args.push('device');
            //args.push('remove');
            //args.push(config.device);
            //args.push(config.mount_path);
            //args.push('&');
            return {
                command: "bash",
                args
            };

        },
        remove(config) {
            
            //let str = `btrfs device remove ${config.device} ${config.mount_path}`;
            //'bash', '-c', 
            //let args = ['-c', str, '>', '/tmp/btrfs_remove.log',
            //           '&'];
            //let args = [str];
            let args = [];
            //let args = [str];
            args.push('device');
            args.push('remove');
            args.push(config.device);
            args.push(config.mount_path);
            //args.push('&');
            return {
                command: "btrfs",
                args
            };
        },
        add(config) {
            let args = [];
            args.push('device');
            args.push('add');
            args.push('-f');
            config.nodiscard && args.push('--nodiscard');
            args.push(config.device);
            args.push(config.mount_path);
            return {
                command: "btrfs",
                args
            };
        },
        replace: {
            start(config) {
                let args = [];
                args.push('device');
                args.push('replace');
                args.push('start');
                args.push(config.device);
                args.push(config.target_device);
                args.push(config.mount_path);
                return {
                    command: "btrfs",
                    args
                };
            },
            status(config) {
                let args = [];
                args.push('device');
                args.push('replace');
                args.push('status');
                args.push('-1');
                args.push(config.mount_path);
                return {
                    command: "btrfs",
                    args
                };
            }
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
    format(config) {
        let args = [];
        args.push("format");
        args.push("-f");
        args.push(`--compression=${config['compression']}`);
        if(config["encrypted"]) args.push("--encrypted");
        args.push(`--foreground_target=${config['foreground_target']}`);
        args.push(`--promote_target=${config['promote_target']}`);
        args.push(`--background_target=${config['background_target']}`);
        args.push(`--replicas=${config['replicas']}`);
        for(let disk of config['label']) {
            args.push(`--label=${disk.name}`);
            args.push(`${disk.path}`);
        }
        return {
            command: this.command,
            args
        };
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
    
};

export default btrfs;
