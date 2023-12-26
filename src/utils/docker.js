import api from '../api';
import {init_data} from "../store/global_data.js";
import cmd from "./command.js";
const docker = {
    docker_config: './docker',
    async get_config(config) {
        let dir = `${this.docker_config}/${config.title}`;
        let mkdir_ret = await this.mkdir(dir);
        let env_file = await api.config_file({
            op: 'get',
            filename: `${dir}/.env`,
        });
        let docker_compose = await api.config_file({
            op: 'get',
            filename: `${dir}/docker-compose.yml`,
            data: config.config
        });
        if(env_file.ret == 0 && docker_compose.ret == 0) {
            return {
                ret:0,
                env: env_file,
                compose: docker_compose
            };
        } else {
            return {
                ret: -2,
                env: env_file,
                compose: docker_compose
            };
        }
    },
    stop_container(config, callback={stdout:null, stderr:null, onerr:null}) {
        let args = {
            "command": "/bin/bash",
            "args":["-c", `cd ${config.dir} && docker compose stop`]
        };
        cmd.long_cmd(args, callback);
    },
    start_container(config, callback={stdout:null, stderr:null, onerr:null}) {
        let args = {
            "command": "/bin/bash",
            "args":["-c", `cd ${config.dir} && docker compose up -d`]
        };
        cmd.long_cmd(args, callback);
    },
    async mkdir(dir) {
        let p = {
            command: "mkdir",
            args:["-p", dir]
        };
        return await api.run_command(p);
    },
    async save_config(config) {
        let dir = `${this.docker_config}/${config.title}`;
        let mkdir_ret = await this.mkdir(dir);
        let env_file = await api.config_file({
            op: 'put',
            filename: `${dir}/.env`,
            data: config.env
        });
        let docker_compose = await api.config_file({
            op: 'put',
            filename: `${dir}/docker-compose.yml`,
            data: config.config
        });
        if(env_file.ret == 0 && docker_compose.ret == 0) {
            return {
                ret:0,
                env: env_file,
                compose: docker_compose
            };
        } else {
            return {
                ret: -2,
                env: env_file,
                compose: docker_compose
            };
        }
    },
    async start() {
    },
    async stop() {
    },
    async list() {
    },
    async list_all() {
        let p = {
            command: "docker",
            args:["ps", "-a"]
        };
        return await api.run_command(p);
    },
    install(callback = { stdout: null, stderr: null, onerr: null, onend: null }) {
        cmd.long_cmd({
            "command": "./scripts/install_docker_debian.sh",
            args: ["docker"],
        }, callback);

        /*
        return new Promise(async (resolve, reject)=> {
            let p = {
                command: {
                    "command":"./scripts/install_docker_debian.sh",
                    args:["docker"],
                },
                key: 'install_docker',
                'type': 'command',
            };
            init_data.watch('install_docker', (v)=> {
                console.log("install_docker===", v);
                init_data.unwatch("install_docker");
                if(v.ret != 0) {
                    reject(v);
                } else {
                    resolve(v);
                }
            });
            await api.proc_command(p);
        });
        */
    },
    async check_install() {
        let p = {
            command: "which",
            args:["docker"]
        };
        return await api.run_command(p);
    },
};

export default docker;
