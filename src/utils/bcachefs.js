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
        add(config) {
            let args = [];
            args.push('device');
            args.push('add');
            config.label && config.label != '' && args.push(`--label=${config.label}`);
            config.fs_size && config.fs_size != '' && args.push(`--fs_size=${config.fs_size}`);
            config.discard && config.discard == true && args.push(`--discard`);
            config.bucket && config.bucket != '' && args.push(`--bucket=${config.bucket}`);
            args.push(config.mount_path);
            args.push(config.device);
            return {
                command: "bcachefs",
                args
            };
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
    mount(config) {
        let args = [];
        args.push("-t");
        args.push("bcachefs");
        args.push(config['label'].map(v=>v.path).join(':'));
        args.push(config.mount_path);
        return {
            command: "mount",
            args
        };
    },
    umount(config) {
        let args = [];
        args.push(config.mount_path);
        return {
            command: "umount",
            args
        };

    }
};

export default bcachefs;
