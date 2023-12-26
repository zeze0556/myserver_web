import React, { useState, useEffect, useRef,useContext } from 'react';
import docker from '../utils/docker';
//import api from '../api';
import JsonEditorForm from './JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon} from 'xterm-addon-attach';
import { useData } from "../store/global_data.js";
import { styled } from '@mui/system';
import { Table, Pagination, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, TableContainer,
         TableHead,
         TableRow,
         TableCell,
         TableBody,
         Paper,
         TablePagination,
         Container,
         Box,
         Modal
       } from '@mui/material';

import CommonWindow from './CommonWindow';

function ContainOp(props) {
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
        docker[props.data.op](props.data, {
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
            }
        });
    },[props]);
    return (<Box ref={shell_ref} width="100vh" height="100vh"/>);
}

function DockerList(props) {
    const [state, setState] = useState({
        page:0,
        filter:'',
        rowsPerPage:10,
        dockerlist:props.data || [],
        loading:true
    });
    let update_state = (v) => {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };

    const handleChangePage = (event, newPage) => {
        update_state({page:newPage});
    };

    const handleChangeRowsPerPage = (event) => {
        update_state({ rowsPerPage: parseInt(event.target.value, 10), page:0});
    };
    const handleFilterChange = (event) => {
        update_state({filter:event.target.value});
    };
    const handleEditClick = (parameter) => {
    };
    const filteredData = state.dockerlist.filter((row) => {
        return Object.values(row).some((value) => {
            return value.toString().toLowerCase().includes(state.filter.toLowerCase());
        });
    });
    const { global_data, api } = useData();
    let get_status = async () => {
        let dockerlist = state.dockerlist;
        for (let i = 0; i < dockerlist.length; i++) {
            let ret = await api.run_command({
                command: "/bin/bash",
                args: ["-c", `cd /app/docker/${dockerlist[i].name}&&docker compose ps --format json`]
            });
            if (ret.ret == 0) {
                let data = JSON.parse(ret.data.stdout);
                dockerlist[i]= {...dockerlist[i],
                                ...data};
            }
            update_state({dockerlist:dockerlist});
        }
    };
    useEffect(()=> {
        update_state({dockerlist: props.data});
        get_status();
        let update = setInterval(async () => {
                get_status();
            }, 10000);
        return ()=> {
            clearInterval(update);
        };
    },[]);
    return <><TableContainer component={Paper}>
               <Table>
                 <TableHead>
    <TableRow>
      <TableCell>操作</TableCell>
    <TableCell>名称</TableCell>
      <TableCell>状态</TableCell>
      <TableCell>端口</TableCell>
      <TableCell>mount</TableCell>
                    <TableCell>Status</TableCell>
    </TableRow>
                 </TableHead>
                 <TableBody>
    {filteredData
     .slice(state.page * state.rowsPerPage, state.page * state.rowsPerPage + state.rowsPerPage)
     .map((row) => (
         <TableRow key={row.name}>
           <TableCell>
             { props.onUp && row.State != 'running' &&
               <Button onClick={() => props.onUp(row)}>启动</Button>
             }
             { props.onDown && row.State == 'running' &&
               <Button onClick={() => props.onDown(row)}>停止</Button>
             }
             { props.onConfig &&
               <Button onClick={() => props.onConfig(row)}>配置</Button>
             }
           </TableCell>
           <TableCell>
             {row.name}
           </TableCell>
           <TableCell>
             {row.State}
           </TableCell>
           <TableCell>
             {row.Ports}
           </TableCell>
           <TableCell>
             {row.Mounts}
           </TableCell>
             <TableCell>
                 {row.Status}
             </TableCell>
         </TableRow>
     ))}
                 </TableBody>
               </Table>
           </TableContainer>
        <TablePagination
    component="div"
    count={filteredData.length}
    page={state.page}
    onPageChange={handleChangePage}
    rowsPerPage={state.rowsPerPage}
    onRowsPerPageChange={handleChangeRowsPerPage}
    style={{ marginTop: '1rem' }}
        />
           </>;
}

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
        docker[props.data.op]({
            stdout:(out)=> {
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

export default function Docker(props) {
    let [state, setState] = useState({
        data: {
            title: "",
            env: "",
            config: "",
        },
        dockerlist:[],
        installed:false,
        open_dialog:false,
        open_container_up_dialog:false,
        cur_container: null,
        schema: {
            "type": "object",
            "title": "新建docker容器",
            "properties": {
                "title": {
                    "type": "string",
                    "title": "容器名称",
                },
                "env": {
                    "type": "string",
                    "title": "环境变量",
                    "format": "ini",
                    "default": "",
                    "options": {
                        "ace": {
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                            "wrap": true
                        }
                    }
                },
                "config": {
                    "type": "string",
                    "format": "yaml",
                    "title": "docker-compose配置",
                    "default": "",
                    "options": {
                        "ace": {
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                            "wrap": true
                        }
                    }
                }
            },
            "require": [
                "title",
                "env",
                "config"
            ]
        }
    });
    const { global_data, api } = useData();
    let update_state = (v) => {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };

    let get_docker_config = async()=> {
        let read_ret = await api.config_file({filename:'config/container.config', 'op':"get"});
        if(read_ret.ret == 0 && read_ret.data) {
            let config = JSON.parse(read_ret.data);
            console.log("get docker list config====", config);
            update_state({dockerlist:config||[]});
        }
    };
    let check_install = async ()=> {
        let ret = await docker.check_install();
        if(ret.ret == 0 && ret.data && ret.data.stdout != '') {
            //set_installed(true);
            update_state({install_dialog: false, run_command:{}, installed: true});
            await get_docker_config();
            let list_ret = await docker.list_all();
            if(list_ret.ret == 0 && list_ret.data && list_ret.data.stdout != '') {
                let data = list_ret.data.stdout;
                let pd = data.split('\n');
                let list = [];
                for(let i = 1; i < pd.length -1; i++) {
                    list.push(pd[i]);
                }
                if(list.length > 1) {
                    const headers = list[0].split(/\s+/);
                    //CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
                    const jsonData = [];
                    for (let i = 1; i < list.length; i++) {
                        const values = list[i].split(/\s+/);
                        const obj = {};
                        for (let j = 0; j < headers.length; j++) {
                            obj[headers[j]] = values[j];
                        }
                        jsonData.push(obj);
                    }
                    //update_state({dockerlist:jsonData});
                }
            }
        }
    };
    let install_docker = async () => {
        let run_command = {};
        if(!state.installed) {
            run_command = { op: 'install' };
        }
        if (!run_command.op) {
            update_state({ install_dialog: false });
        } else {
            update_state({ install_dialog: true, run_command });
        }
    };

    let up_container = async(row)=> {
        update_state({ cur_container: { ...row, op: "start_container"}, open_container_up_dialog:true});
    };

    let down_container = async(row)=> {
        update_state({ cur_container: { ...row, op: "stop_container" }, open_container_up_dialog: true });
    };
    let Running_Docker = ()=> {
        return <DockerList data={state.dockerlist} onUp={up_container} onConfig={config_container} onDown={down_container}/>;
    };
    let handleCloseDialog = ()=> {
        update_state({open_dialog: false});
    };
    let handleSave = async (v)=> {
        let config = jsonEditorFormRef.current.getValue();
        let save = await docker.save_config(config);
        let dockerlist = state.dockerlist;
        if(save.ret == 0) {
            let index = dockerlist.findIndex(v=>v.dir == `${docker.docker_config}/${config.title}`);
            if(index >= 0) {
                dockerlist.splice(index, 1, {name: config.title,
                                             dir: `${docker.docker_config}/${config.title}`
                                            });
            } else {
                dockerlist.push({name: config.title,
                                 dir: `${docker.docker_config}/${config.title}`
                                });
            }
            let write_ret = await api.config_file({filename:'config/container.config', 'op':"put", data: JSON.stringify(dockerlist)});
            update_state({dockerlist, open_dialog:false});
        }
    };
    let add = async()=> {
        let schema = {...state.schema,
                      title: "新建"
                     };
        update_state({
            open_dialog: true,
            schema: schema
        });
    };
    let config_container = async(row)=> {
        let schema = {...state.schema,
                      title: "修改容器"
                     };
        let name = row.name;
        let dir = row.dir;
        let ret = await docker.get_config({title:name, dir:dir});
        if(ret.ret  == 0) {
            update_state({
                schema: schema,
                "title": row.name,
                "env": ret.env.data,
                "config":ret.compose.data,
                open_dialog: true
            });
        }
    };
    const jsonEditorFormRef = useRef(null);
    const CustomDialogContent = styled(DialogContent)({
        width: '80%',
    });
    const RenderDialog = () => {
        return (
            <Dialog open={state.open_dialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
              <DialogTitle>配置</DialogTitle>
              <CustomDialogContent>
                <JsonEditorForm schema={state.schema} ref={jsonEditorFormRef} data={state.data}/>
              </CustomDialogContent>
              <DialogActions>
                <Button onClick={handleSave}>保存</Button>
                <Button onClick={handleCloseDialog}>取消</Button>
              </DialogActions>
            </Dialog>
        );
    };

    let handle_close_container_up =()=> {
        //set_open_container_up_dialog(false);
        update_state({open_container_up_dialog:false});
    };
    useEffect(()=> {
        check_install();
        return ()=> {
        };
    },[]);
    let RenderContainerOp = ()=> {
        return <Dialog open={state.open_container_up_dialog} onClose={handle_close_container_up} fullWidth maxWidth="md">
                 <DialogTitle>启动容器</DialogTitle>
                 <CustomDialogContent>
                   <ContainOp  data={state.cur_container}/>
                 </CustomDialogContent>
                 <DialogActions>
                   <Button onClick={handle_close_container_up}>取消</Button>
                 </DialogActions>
               </Dialog>;

    };
    return <><CommonWindow title="docker" {...props}>
        <Container>
            {!state.installed &&
                <Button onClick={install_docker}>安装docker</Button>
            }
            {state.installed &&
                <Button onClick={add}>新建容器</Button>
            }
            <Running_Docker />
            <RenderDialog />
            <RenderContainerOp />
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

};
