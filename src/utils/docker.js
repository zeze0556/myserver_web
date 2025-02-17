import React, {forwardRef,useState, Fragment,useEffect, useRef, useContext } from 'react';
import {WindowApi, useWindowManager} from "../rix/RixWindowManager";
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import RixPanel from "../rix/RixPanel";
import RixTable from "../rix/RixTable";
import RixTemplate from "../rix/RixTemplate";
import Config_Schema from "../components/config_schema.js";
import {context_value} from "../store/global_data";
import cmd from "./command.js";
import Disks from "./disks";
import JsonEditorForm from '../components/JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import moment from 'moment';

const {global_data, api, make_watch_data} = context_value;
const docker = {
    docker_config: '/app/config/docker',
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
    async start(callback={stdout:null, stderr:null, onerr:null, onend:null}) {
        cmd.long_cmd({
            "command": "/bin/bash",
            args: [`/app/scripts/start_docker.sh`]
        }, callback);
    },
    async stop(callback) {
        cmd.long_cmd({
            "command": "/bin/bash",
            args: [`/app/scripts/stop_docker.sh`]
        }, callback);
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
    async info() {
        let p = {
            command: "docker",
            args:["info", "-f", "json"]
        };
        let info = await api.run_command(p);
        if(info.ret == 0) {
            try {
                let j = JSON.parse(info.data.stdout);
                info = j;
            } catch (e) {
                info = null;
            }
        }
        if(info) {
            if(info.ID != '') {
                global_data.set('docker_service', 'running');
            } else {
                global_data.set('docker_service', 'stop');
            }
        }
        return info;
    },
    install(callback = { stdout: null, stderr: null, onerr: null, onend: null }) {
        cmd.long_cmd({
            "command": "/app/scripts/install_docker_debian.sh",
            args: ["docker"],
        }, callback);
    },
    async check_install() {
        let p = {
            command: "which",
            args:["docker"]
        };
        return await api.run_command(p);
    },

    async get_docker_config() {
        let read_ret = await api.config_file({ filename: '/app/config/docker.config', 'op': "get"});
        return read_ret;
    },
    DockerCmd(props){
        const terminal = useRef(null);
        const shell_ref = useRef(null);
        useEffect(() => {
            terminal.current = new Terminal({
                rendererType: 'canvas',
                rows: 40,
                convertEol: true,
                scrollback: 10,
                disableStdin: false,
                cursorStyle: 'underline',
                cursorBlink: true,
                useStyle:true,
                ping: 15000,
            });
            let socket = null;
            const fitAddon = new FitAddon();
            terminal.current.loadAddon(fitAddon);
            terminal.current.onResize((size) => {
                // 调整 xterm 和 WebSocket 的窗口大小
                fitAddon.fit();
                const dimensions = fitAddon.proposeDimensions();
                if (dimensions?.cols && dimensions?.rows) {
                    // term.resize(dimensions.cols, dimensions.rows);
                    terminal.current.resize(dimensions.cols, dimensions.rows);
                    /*
                    socket.send(
                        JSON.stringify({
                            type: 'resize',
                            cols: dimensions.cols,
                            rows: dimensions.rows,
                        }),
                    );
                    */
                }
            });
            terminal.current.open(shell_ref.current);
            cmd.long_cmd(props.cmd, {
                onopen:(ws)=> {
                    socket = ws;
                    terminal.current.focus();
                    fitAddon.fit();
                    terminal.current.onData((data) => {
                        ws.send(JSON.stringify({"op":"input",
                                               stdin:data}));
                    });
                },
                stdout: (out) => {
                    let j = JSON.parse(out);
                    if(j.op == 'out') {
                        if (terminal.current)
                            terminal.current.write(j.stdout);
                    }
                    //set_container_up_message(container_up_message+out);
                },
                stderr: (err) => {
                    console.log("container stderr=", err);
                },
                onerr: (err) => {
                    console.log("container err=", err);
                },
                onend: () => {
                    props.onEnd();
                }
            });
        }, []);
        return <div ref={shell_ref} style={{
            "height": "100%"
        }}/>;
    },
    CommandDialog(props1) {
        let {command, title} = props1;
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;
        let Dialog = (props)=> {
            return <RixDialog width="fit-content" id={props.id}>
                <div type="title">{title}</div>
                <div type="content">
                <docker.DockerCmd cmd={command} onEnd={()=>{
                    closeDialog(props.id);
                    if(props1.onEnd) {
                        props1.onEnd();
                    }
                }}/>
                </div>
                <button type="action" className="button js-dialog-close">
                关闭
            </button>
                </RixDialog>;
        };
        let id = 'dialog_'+Date.now();
        openDialog({
            id,
            content: <Dialog id={id}/>
        });
    },
    StopContainer(container_id) {
        let cmd = {
            command: "docker",
            args: ["stop", `${container_id}`]
        };
        docker.CommandDialog({command:cmd, title:"正在停止"});
    },
    RestartContainer(container_id) {
        let cmd = {
            command: "docker",
            args: ["restart", `${container_id}`]
        };
        docker.CommandDialog({command:cmd, title:"正在重启"});
    },
    ContainerShell(container_id) {
        let cmd = {
            command: "docker",
            args: ["exec", "-it", `${container_id}`, "sh"]
        };
        docker.CommandDialog({command:cmd, title:"shell"});
    },
    RendSetting(props) {
        let w = useWindowManager();
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog} = w;
        let config= {};
        let schema = {
            ...Config_Schema,
            "$ref": "#/definitions/docker_config",
        };
        let [state, setState] = useState({
            pools:[],
            config:{},
            docker_status: global_data.docker_service || "unknown"
        });
        schema['definitions']['pool']['properties']['pool_name']['options'].pools = state.pools;
        let update_state = (v) => {
            setState((prev) => {
                return { ...prev, ...v };
            });
        };
        const jsonEditorFormRef = useRef(null);
        let get_config = async() => {
            let read_ret = await docker.get_docker_config();
            update_state({config:read_ret});
            await docker.info();
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

        let save = async ()=> {
            let data = jsonEditorFormRef.current.getValue();
            let {save_config} = data;
            switch(save_config.type) {
            case 'disk_path': {
                save_docker_config(data);
            }
                break;
            case 'pool': {
                let { save, pool_name } = save_config;
                if(save.type == 'pool_path') {
                    save_docker_config(data);
                } else if (save.type == 'pool_img') {
                    let config = save.config;
                    let pool = state.pools.filter(v=>v.name == pool_name)[0];
                    if(config.type == 'existed_img') {
                        save_docker_config(data);
                    } else if (config.type == 'new_img') {
                        let p = Disks.parseSizeAndUnit(config.fs_size);
                        let temp_cmd = `#/bin/bash
cd ${pool.mount_path}
rm -rf ${config.path}
dd if=/dev/zero of=${config.path} bs=1${p.unit} count=${p.block}
freeloop=$(losetup -f)
losetup $freeloop "${config.path}"
mkfs -t ${config.fs_type} $freeloop
sync
losetup -d $freeloop
`;
                        let write_ret = await api.config_file({ filename: '/tmp/create_docker_img.sh', 'op': "put", data: temp_cmd });
                        if (write_ret.ret == 0) {
                            let MkDocker = () => {
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
                                            args: [`/tmp/create_docker_img.sh`]
                                        }, {
                                            stdout: (out) => {
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
                                                save_docker_config(data);
                                            }
                                        });
                                    }, []);
                                    return <div ref={shell_ref} width="100%" height="100%" />;
                                };
                                return (
                                        <RixDialog fullWidth>
                                        <div type="title">格式化</div>
                                        <div type="content" width="100%" height="100%">
                                        <Cmd/>
                                        </div>
                                        <button type="action" className="button js-dialog-close">
                                        关闭
                                    </button>
                                        </RixDialog>
                                );
                            };
                            let id = 'dialog_'+Date.now();
                            openDialog({
                                id,
                                content: <MkDocker id={id}/>
                            });
                        } else {
                        }
                    }
                }
                break;
            }
            }
        };
        let start = async () => {
                let id = 'dialog_'+Date.now();
                openDialog({
                    id,
                    content: <docker.StartDocker id={id}/>
                });
        };
        let stop = async () => {
            let id = 'dialog_'+Date.now();
            openDialog({
                id,
                content: <docker.StopDocker id={id}/>
            });
        };

        let Status = ()=> {
            let [state, update] = useState(0);;
            useEffect(()=> {
                let w = global_data.watch('docker_service', ()=> {
                    update(state+1);
                });
                return ()=> {
                    global_data.unwatch(state);
                };
            });
            if(global_data.docker_service== 'running') {
                return <RixButton className="button warning" onClick={stop}>停止</RixButton>;
            } else {
                return <RixButton className="button success" onClick={start}>启动</RixButton>;
            }
        };

        return <div {...props}>
            <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={state.config}/>
            <div style={{
                "display": "flex",
                "justifyContent": "space-between"
            }} className="w-100">
            <RixButton className="button success" onClick={save}>保存</RixButton>
            <Status/>
            </div>
            </div>;
    },
    StartDocker(props) {
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
                docker.start({
                    stdout: (out) => {
                        if (terminal.current)
                            terminal.current.write(out);
                        //set_container_up_message(container_up_message+out);
                    },
                    onend:()=> {
                        docker.info();
                    }
                });
            });
            return <div ref={shell_ref} width="100%" height="100%" />;
        };
        return (
                <RixDialog id={props.id} fullWidth maxWidth="md">
                <div type="title">启动docker</div>
                <div type="content" width="100%" height="100%">
                <Cmd />
                </div>
                </RixDialog>
        );
    },
    StopDocker(props) {
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
                docker.stop({
                    stdout: (out) => {
                        if (terminal.current)
                            terminal.current.write(out);
                        //set_container_up_message(container_up_message+out);
                    },
                    onend:()=> {
                        docker.info();
                    }
                });
            });
            return <div ref={shell_ref} width="100%" height="100%" />;
        };
        return (
                <RixDialog id={props.id} fullWidth maxWidth="md">
                <div type="title">停止docker</div>
                <div type="content" width="100%" height="100%">
                <Cmd />
                </div>
                </RixDialog>
        );
    },
    async inspect(id) {
        let p = {
            command: "docker",
            args:["inspect", "--format", "json", id]
        };
        let res = await api.run_command(p);
        let ret = {};
        if(res.ret == 0) {
            let list = res.data.stdout.split(`\n`).filter(v=>v.trim().length > 0).map(v=> {
                let obj = JSON.parse(v);
                return obj[0];
            });
            return {ret:0, data:list[0]};
        }
        return ret;
    },
    network: {
        async inspect(id) {
            let p = {
                command: "docker",
                args:["network", "inspect", "--format", "json", id]
            };
            let res = await api.run_command(p);
            let ret = {};
            if(res.ret == 0) {
                let list = res.data.stdout.split(`\n`).filter(v=>v.trim().length > 0).map(v=> {
                    let obj = JSON.parse(v);
                    return obj[0];
                });
                return {ret:0, data:list[0]};
            }
            return ret;
        },
        async ls() {
            let p = {
                command: "docker",
                args:["network", "ls", "--format", "json"]
            };
            let res = await api.run_command(p);
            let ret = {};
            if(res.ret == 0) {
                let list = res.data.stdout.split(`\n`).filter(v=>v.trim().length > 0).map(v=> {
                    let obj = JSON.parse(v);
                    if(obj.Labels) {
                        let Labels = {};
                        obj.Labels.split(',').map(l=> {
                            let [key, value] = l.split('=');
                            return {key, value};
                        }).forEach(one=> {
                            Labels[one.key] = one.value;
                        });
                        obj.Labels = Labels;
                    }
                    return obj;
                });
                list.forEach(v=> {
                    ret[`${v.Name}`] = v;
                });
            }
            return ret;
        }
    },
    DockerComposeEdit(props) {
        let {docker_compose_dir, name} = props;
        let load_compose = async() => {
            let env_file = "";
            try {
                env_file = await api.config_file({
                    op: 'get',
                    filename: `${docker_compose_dir}/.env`,
                });
            } catch {
            }
            let docker_compose = "";
            try {
                docker_compose = await api.config_file({
                    op: 'get',
                    filename: `${docker_compose_dir}/docker-compose.yml`,
                });
            } catch {
            }
            let docker_compose_overrider = "";
            try {
                docker_compose_overrider = await api.config_file({
                    op: 'get',
                    filename: `${docker_compose_dir}/docker-compose.override.yml`,
                });
            } catch {
            }
            return {".env": env_file,
                    "docker-compose.yml": docker_compose,
                    "docker-compose.override.yml": docker_compose_overrider
                   };
        };
        let save_compose = async(data) => {
            await Disks.mkdir(`${docker_compose_dir}`);
            await api.config_file({
                op: 'put',
                filename: `${docker_compose_dir}/.env`,
                data: data['.env']
            });
            await api.config_file({
                op: 'put',
                filename: `${docker_compose_dir}/docker-compose.yml`,
                data: data['docker-compose.yml']
            });
            await api.config_file({
                op: 'put',
                filename: `${docker_compose_dir}/docker-compose.override.yml`,
                data: data['docker-compose.override.yml']
            });
            return {ret:0};
        };

        load_compose().then(res=> {
            let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;

            let id = 'dialog_'+Date.now();
            let Dialog = (props)=> {
                const jsonEditorFormRef = useRef(null);
                let schema = {
                    ...Config_Schema,
                    "$ref": "#/definitions/docker_compose_config",
                };
                let config = res;
                let save = ()=> {
                    let value = jsonEditorFormRef.current.getValue();
                    save_compose(value).then(res=> {
                        closeDialog(id);
                    }).catch(e=> {
                    });
                };
                return <RixDialog width="fit-content" id={props.id}>
                    <div type="title">{name}</div>
                    <div type="content">
                    <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
                    </div>
                    <button type="action" className="button success" onClick={save}> 保存 </button>
                    <button type="action" className="button js-dialog-close"> 关闭 </button>
                    </RixDialog>;
            };
            openDialog({
                id,
                content: <Dialog id={id}/>
            });
        });
    },
    default_name_config:{
        'bridge':"默认桥接",
        'host': "主机网络",
        "none": "无网络"
    },
    ContainerInfo(props) {
        let state = make_watch_data({...props.data,
                                     Containers:[],
                                    });
        let Name = state.Name;
        if(state.Labels && state.Labels['com.docker.compose.project']) {
            Name = state.Labels['com.docker.compose.project'];
        }
        let w = useWindowManager();
        Name = docker.default_name_config[Name] || Name;
        let get_containers = async ()=> {
            let res = await docker.network.inspect(state.ID);
            if(res.ret == 0) {
                let data = res.data;
                state.set("IPAM", data.IPAM);
                let Containers = [];
                for(let ID in data.Containers) {
                    let one = data.Containers[ID];
                    let add = {
                        ...one,
                        ID
                    };
                    let one_info = await docker.inspect(ID);
                    if(one_info.ret == 0) {
                        let t = {...add,
                                ...one_info.data};
                        add = t;
                    }
                    Containers.push(add);
                }
                if(Containers.length > 0) {
                    let first = Containers[0]?.Config?.Labels??{};
                    if(first['com.docker.compose.project.working_dir']) {
                        state.set("docker_compose_dir", first['com.docker.compose.project.working_dir']);
                    }
                    if(first['com.docker.compose.project.config_files']) {
                        state.set("docker_compose_file", first['com.docker.compose.project.config_files'].split(',')[0]);
                    }
                }
                state.set("Containers", Containers);
            }
        };
        useEffect(()=> {
            get_containers();
        });
        let Title = ()=> {
            return <div>{Name} 网络模式:{state.Driver}</div>;
        };
        let Containers = ()=> {
            let [update, setUpdate] = useState(0);
            useEffect(()=> {
                let w = state.watch('Containers', ()=> {
                    setUpdate(update+1);
                });
                return ()=> {
                    state.unwatch('Containers', w);
                };
            });
            if(!state.Containers || state.Containers.length == 0) {
                return <div>无运行的容器</div>;
            }
            let ContainRunState = ({row})=> {
                let State = row.State;
                let time = moment().from(State.StartedAt);//.fromNow();
                let str = ``;
                if(State.Status == 'running') {
                    str = `已正常运行 ${time}`;
                } else {
                    let time = moment(State.StartedAt).fromNow();
                    str = `创建于 ${time} `;
                }
                return <>{str}</>;
            };
            let RendPort = ({row})=> {
                let NetworkSettings = row.NetworkSettings;
                let HostConfig = row.HostConfig;
                let IPv4Address = row.IPv4Address.split(`/`)[0];
                if(HostConfig.PortBindings) {
                    let str = [];
                    for(let port in HostConfig.PortBindings) {
                        let one = HostConfig.PortBindings[port];
                        str.push(<p key={port}>{IPv4Address}:{port}=>{one[0].HostIp}:{one[0].HostPort}</p>);
                    }
                    return <div>{str}</div>;
                }
                return <></>;
            };
            let RendVolumn = ({row})=> {
                let HostConfig = row.HostConfig;
                if(HostConfig.Binds && HostConfig.Binds.length > 0) {
                    let ret = [];
                    let index = 0;
                    for(let one of HostConfig.Binds) {
                        let t = one.split(':');
                        index +=1;
                        ret.push(<p key={index}>{t[0]}=>{t[1]}</p>);
                    }
                    return <div>{ret}</div>;
                }
                return <></>;
            };
            let Rend_Action = ({row})=> {
                let buttons = [];
                let State = row.State;
                if(State.Status == 'running') {
                    buttons.push(<li key="stop"><RixButton className="button alert"
                                 onClick={()=>{
                                     docker.StopContainer(row.ID);
                                 }}>停止</RixButton></li>);
                    buttons.push(<li key="shell"><RixButton className="button alert"
                                 onClick={()=>{
                                     docker.ContainerShell(row.ID);
                                 }}>控制台</RixButton></li>);
                }
                if(State.Status == 'stopped') {
                    buttons.push(<li key="start"><RixButton className="button success">启动</RixButton></li>);
                }
                buttons.push(<li key="restart"><RixButton className="button warning" key="restart"
                             onClick={()=> {
                                 docker.RestartContainer(row.ID);
                             }}>重启</RixButton></li>);
                return <div className="dropdown-button">
                    <RixButton className="button dropdown-toggle" style={{width:"fit-content"}}>操作</RixButton>
                    <ul className="d-menu" data-role="dropdown">
                    {buttons}
                </ul>
                    </div>;
                //return <div style={{"display":"flex"}}>{buttons}</div>;
            };
            let containers = state.Containers;
            return <RixTable data={containers} pagination table_info>
                <RixTable.TableColumn label="编辑">
                <RixTemplate slot="header" slot-scope="{row}">
                </RixTemplate>
                <RixTemplate slot-scope="{row}">
                <Rend_Action/>
                </RixTemplate>
                </RixTable.TableColumn>
                <RixTable.TableColumn label="名称" prop="Name"/>
                <RixTable.TableColumn label="端口映射">
                <RixTemplate slot-scope="{row}">
                <RendPort/>
                </RixTemplate>
                </RixTable.TableColumn>
                <RixTable.TableColumn label="卷映射">
                <RixTemplate slot-scope="{row}">
                <RendVolumn/>
                </RixTemplate>
                </RixTable.TableColumn>
                <RixTable.TableColumn label="运行时间">
                <RixTemplate slot-scope="{row}">
                <ContainRunState/>
                </RixTemplate>
                </RixTable.TableColumn>
                </RixTable>;
        };
        let Action = ()=> {
            let buttons = [];
            let [update, setUpdate] = useState(0);
            useEffect(()=> {
                let w = state.watch('docker_compose_file', ()=> {
                    setUpdate(update+1);
                });
                return ()=> {
                    state.unwatch('docker_compose_file', w);
                };
            });
            let edit = ()=> {
                if(state.docker_compose_dir != null) {
                    docker.DockerComposeEdit({
                        name: Name,
                        docker_compose_dir: state.docker_compose_dir,
                        });
                }
            };
            if(state.docker_compose_dir != null) {
                buttons.push(<li key="restart"><RixButton className="button warning">重启</RixButton></li>);
                buttons.push(<li key="edit"><RixButton className="button success" onClick={edit}>编辑</RixButton></li>);
                buttons.push(<li key="stop"><RixButton className="button alert">停止</RixButton></li>);
                buttons.push(<li key="down"><RixButton key="down" className="button alert">下线</RixButton></li>);
                return <div className="dropdown-button">
                    <RixButton className="button dropdown-toggle" style={{width:"fit-content"}}>操作</RixButton>
                    <ul className="d-menu" data-role="dropdown">
                    {buttons}
                    </ul>
                    </div>;
            }
            return <></>;
        };
        return <RixPanel collapsible {...props} className="w-100" style={{overflow: "visible"}}>
            <Title type="title"/>
            <div type='icon' class='mif-apps'></div>
            <Action type="button">
            </Action>
            <Containers />
            <div>
        </div>
        </RixPanel>;
    },
    RunningView(props) {
        let state = make_watch_data({networks:{},
                                    });
        let cate_by_networks = async()=> {
            let networks = await docker.network.ls();
            state.set("networks", networks);
        };
        useEffect(()=> {
            cate_by_networks();
        });
        let RenderByCate = (props)=> {
            let [update, setUpdate] = useState(0);
            let ret = [];
            useEffect(()=> {
                let w = state.watch('networks', ()=> {
                    setUpdate(update+1);
                });
                return()=> {
                    state.unwatch('networks', w);
                };
            });
            for(let network in state.networks) {
                let one = state.networks[network];
                ret.push(<Fragment key={network}><docker.ContainerInfo data={one} className="w-100"/></Fragment>);
            }
            return ret;
        };
        return <div className="w-100" {...props}><RenderByCate className="w-100"/></div>;
    },
    remove_from_project(row) {
        let old_list = docker.docker_project.list;
        if(row.network_id) {
            let index = old_list.findIndex(v=>v.network_id == row.network_id);
            if(index >= 0) {
                old_list.splice(index, 1);
                docker.docker_project.set('list', old_list);
                docker.save_project();
            }
        } else if(row.projname) {
            let index = old_list.findIndex(v=>v.projname == row.projname);
            if(index >= 0) {
                old_list.splice(index, 1);
                docker.docker_project.set('list', old_list);
                docker.save_project();
            }
        }
    },
    async delete_from_disk(row) {
        if(row.network_id) {
            docker.CommandDialog({
                command: {
                    command: "docker",
                    args: ["compose", "-f", row.proj_file, "down"]
                },
                title: `下线 ${row.projname}`,
                onEnd:()=> {
                    docker.remove_from_project(row);
                    Disks.rm(row.proj_dir);
                }
            });
        } else {
            docker.remove_from_project(row);
            Disks.rm(row.proj_dir);
        }
    },
    RenderDockerProject(props) {
        let [state, update] = useState(0);
        useEffect(()=> {
            let w = docker.docker_project.watch('list', ()=> {
                update(state+1);
            });
            return ()=> {
                docker.docker_project.unwatch('list', w);
            };
        });
        let list = docker.docker_project.list;
        let Rend_Action = ({row})=> {
            let buttons = [];
            buttons.push(<li key="edit"><RixButton className="button success"
                         onClick={()=>{
                             docker.DockerComposeEdit({docker_compose_dir: row.proj_dir, name: row.projname});
                         }}>编辑</RixButton></li>);
            buttons.push(<li key="up"><RixButton className="button success"
                         onClick={()=>{
                             if(!row.proj_file) {
                                 row.proj_file = `${row.proj_dir}/docker-compose.yml`;
                             }
                             docker.CommandDialog({
                                 command: {
                                     command: "docker",
                                     args: ["compose", "-f", row.proj_file, "up", "-d"]
                                 },
                                 title: `启动 ${row.projname}`,
                                 onEnd:()=> {
                                     docker.load_project();
                                 }
                             });
                         }}>启动</RixButton></li>);
            buttons.push(<li key="restart"><RixButton className="button success"
                         onClick={()=>{
                             if(!row.proj_file) {
                                 row.proj_file = `${row.proj_dir}/docker-compose.yml`;
                             }
                             docker.CommandDialog({
                                 command: {
                                     command: "docker",
                                     args: ["compose", "-f", row.proj_file, "restart"]
                                 },
                                 title: `重启 ${row.projname}`,
                                 onEnd:()=> {
                                     docker.load_project();
                                 }
                             });
                         }}>重启</RixButton></li>);
            buttons.push(<li key="down"><RixButton className="button success"
                         onClick={()=>{
                             if(!row.proj_file) {
                                 row.proj_file = `${row.proj_dir}/docker-compose.yml`;
                             }
                             docker.CommandDialog({
                                 command: {
                                     command: "docker",
                                     args: ["compose", "-f", row.proj_file, "down"]
                                 },
                                 title: `下线 ${row.projname}`,
                                 onEnd:()=> {
                                     docker.load_project();
                                 }
                             });
                         }}>下线</RixButton></li>);
            buttons.push(<li key="remove"><RixButton className="button alert"
                         onClick={()=>{
                             docker.remove_from_project(row);
                         }}>移除</RixButton></li>);
            buttons.push(<li key="all_delete"><RixButton className="button alert"
                         onClick={()=>{
                             docker.delete_from_disk(row);
                         }}>彻底删除</RixButton></li>);

            return <div className="dropdown-button">
                <RixButton className="button dropdown-toggle" style={{width:"fit-content"}}>操作</RixButton>
                <ul className="d-menu" data-role="dropdown">
                {buttons}
            </ul>
                </div>;
        };
        let Rend_Status = ({row})=> {
            console.log("docker row===", row);
            if(row.containers) {
                return <div>容器数量:{row.containers.length}</div>;
            }
            if(row.network_id) {
                return <div>已停止</div>;
            }
            return <div>从未运行</div>;
        };
        return <RixTable data={list} className="w-100" pagination table_info search>
            <RixTable.TableColumn label="编辑">
            <RixTemplate slot-scope="{row}">
            <Rend_Action/>
            </RixTemplate>
            </RixTable.TableColumn>
            <RixTable.TableColumn label="名称" prop="projname">
            </RixTable.TableColumn>
            <RixTable.TableColumn label="状态">
            <RixTemplate slot-scope="{row}">
            <Rend_Status/>
            </RixTemplate>
            </RixTable.TableColumn>
            <RixTable.TableColumn label="目录" prop="proj_dir">
            </RixTable.TableColumn>
            </RixTable>;
    },
    docker_project:make_watch_data({list:[]}),
    add_shortlist(list) {
        if(list.length > 0) {
            let old_list = global_data.shortlist;
            console.log("add====shortlist==", list, old_list);
            let change = false;
            for(let one of list) {
                let index = old_list.findIndex(v=> {
                    return v.short_type == 'docker' && v.container_id == one.docker.ID;
                });
                if(index >= 0) {
                    if(old_list[index].url != one.url) {
                        old_list[index].url = one.url;
                        change = true;
                    }
                } else {
                    let Icon = ()=> {
                            return <span class="mif-ship fg-blue"/>;
                    };
                    if(one.icon && one.icon != '') {
                        Icon = ()=> {
                                return <span><img src={one.icon}/></span>;
                        };
                    }
                    old_list.push({
                        short_type: 'docker',
                        container_id: one.docker.ID,
                        url: one.url,
                        'rix_type': 'component',
                        title: one.title,
                        name: one.title,
                        caption: one.title,
                        id: `docker_${one.docker.ID}`,
                        icon: <Icon/>,
                        draggable: true,
                        open_type: 'new_window',
                        //path: 'components/VmView.js'
                    });
                    change = true;
                }
            }
            if(change) {
                global_data.set('shortlist', old_list);
            }
        }
    },
    async get_info_network_id(id) {
        let res = await docker.network.inspect(id);
        if(res.ret == 0) {
            let data = res.data;
            let Containers = [];
            for(let ID in data.Containers) {
                let one = data.Containers[ID];
                let add = {
                    ...one,
                    ID
                };
                let one_info = await docker.inspect(ID);
                if(one_info.ret == 0) {
                    let t = {...add,
                             ...one_info.data};
                    add = t;
                }
                Containers.push(add);
            }
            if(Containers.length > 0) {
                let short_list = [];
                for(let c of Containers) {
                    let labels = c?.Config?.Labels??{};
                    let url = '';
                    if(labels['net.unraid.docker.webui']) {
                        url = labels['net.unraid.docker.webui'];
                    }
                    if(labels['net.docker.webui']) {
                        url = labels['net.docker.webui'];
                    }
                    let shortcut = false;
                    if(labels['net.docker.shortcut']) {
                        shortcut = labels['net.docker.shortcut'];
                    }
                    let icon = '';
                    if(labels['net.unraid.docker.icon']) {
                        icon = labels['net.unraid.docker.icon'];
                    }
                    if(labels['net.docker.icon']) {
                        icon = labels['net.docker.icon'];
                    }
                    let title = c.Name;
                    if(labels["com.docker.compose.service"]) {
                        title = labels["com.docker.compose.service"];
                    }
                    if(url != '' && shortcut) {
                        short_list.push({
                            url: url,
                            title,
                            icon: icon,
                            docker: c
                        });
                    }
                }
                docker.add_shortlist(short_list);
                let first = Containers[0]?.Config?.Labels??{};
                if(first['com.docker.compose.project.working_dir']) {
                    let s = first['com.docker.compose.project.working_dir'].split('/');
                    let prj_name= s[s.length-1];
                    let proj_file = `docker-compose.yml`;
                    if(first['com.docker.compose.project.config_files']) {
                        proj_file = first['com.docker.compose.project.config_files'].split(',')[0];
                    }
                    return {projname: prj_name,
                            containers: Containers,
                            network_id: id,
                            network_name: res.Name,
                            networks: res.data,
                            proj_dir: first['com.docker.compose.project.working_dir'],
                            proj_file
                           };
                }
            }
        }
        return null;
    },
    async scan_project() {
        let networks = await docker.network.ls();
        let scan_list = [];
        for(let network in networks) {
            let one = networks[network];
            let info = await docker.get_info_network_id(one.ID);
            if(info) {
                scan_list.push(info);
            }
        }
        if(scan_list.length > 0) {
            let old_list = docker.docker_project.list||[];
            for(let one of scan_list) {
                let f = old_list.filter(v=>v.projname == one.projname)[0];
                if(f) {
                    continue;
                }
                old_list.push(one);
            }
            docker.docker_project.set("list", old_list);
            docker.save_project();
        }
    },
    async load_project() {
        try {
            let project = await api.config_file({
                op: 'get',
                filename: `/app/config/docker_project.config`,
            });
            if(project) {
                let list = [];
                for(let one of project) {
                    if(one.network_id) {
                    let info = await docker.get_info_network_id(one.network_id);
                        if(!info) {
                            await docker.get_info_network_id(one.network_name);
                        }
                    if(info) {
                        list.push(info);
                    }
                    } else {
                        list.push(one);
                    }
                }
                docker.docker_project.set("list", list);
                return list;
            }
        } catch (e) {
        }
        return [];
    },
    new_project() {
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;

        let id = 'dialog_'+Date.now();
        let save_compose = async(data) => {
            let docker_compose_dir = `${data.proj_dir}/${data.proj_name}`;
            await Disks.mkdir(docker_compose_dir);
            await api.config_file({
                op: 'put',
                filename: `${docker_compose_dir}/.env`,
                data: data['.env']
            });
            await api.config_file({
                op: 'put',
                filename: `${docker_compose_dir}/docker-compose.yml`,
                data: data['docker-compose.yml']
            });
            await api.config_file({
                op: 'put',
                filename: `${docker_compose_dir}/docker-compose.override.yml`,
                data: data['docker-compose.override.yml']
            });
            return {ret:0};
        };
        let Dialog = (props)=> {
            const jsonEditorFormRef = useRef(null);
            let schema = {
                ...Config_Schema,
                "$ref": "#/definitions/docker_compose_config_new",
            };
            let config = {};
            let save = ()=> {
                let value = jsonEditorFormRef.current.getValue();
                save_compose(value).then(res=> {
                    let old_list = docker.docker_project.list;
                    old_list.push({
                        projname: value.proj_name,
                        proj_dir: `${value.proj_dir}/${value.proj_name}`,
                        auto_start: value.auto_start
                    });
                    docker.docker_project.set("list", old_list);
                    docker.save_project();
                    closeDialog(id);
                }).catch(e=> {
                });
            };
            return <RixDialog width="fit-content" id={props.id}>
                <div type="title">新建工程</div>
                <div type="content">
                <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
                </div>
                <button type="action" className="button success" onClick={save}> 保存 </button>
                <button type="action" className="button js-dialog-close"> 关闭 </button>
                </RixDialog>;
        };
        openDialog({
            id,
            content: <Dialog id={id}/>
        });
    },
    async save_project() {
        try {
            let data = docker.docker_project.list.map(one=> {
                return {projname: one.projname,
                        proj_dir: one.proj_dir,
                        proj_file: one.proj_file,
                        network_id: one.network_id,
                        network_name: one.network_name,
                        auto_start: one?.auto_start??false,
                       };
            });
            await api.config_file({
                op: 'put',
                filename: `/app/config/docker_project.config`,
                data: JSON.stringify(data)
            });
        } catch (e) {
        }
    },
    ManagerView(props) {
        docker.load_project();
        return <div {...props}>
            <div className="w-100">
            <RixButton className="button success" onClick={()=> {
                docker.new_project();
            }}>新建</RixButton>
            <RixButton className="button success" onClick={()=> {
                docker.scan_project();
            }}>扫描并添加</RixButton>
            </div>
            <div className="w-100">
            <docker.RenderDockerProject className="w-100"/>
            </div>
            </div>;
    }
};

export default docker;
