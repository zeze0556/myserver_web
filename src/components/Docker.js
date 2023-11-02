import React, { useState, useEffect, useRef,useContext } from 'react';
import docker from '../utils/docker';
import api from '../api';
import JsonEditorForm from './JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon} from 'xterm-addon-attach';

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
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };
    const handleEditClick = (parameter) => {
    };
    const filteredData = props.data.filter((row) => {
        return Object.values(row).some((value) => {
            return value.toString().toLowerCase().includes(filter.toLowerCase());
        });
    });
    return <><TableContainer component={Paper}>
               <Table>
                 <TableHead>
    <TableRow>
      <TableCell>操作</TableCell>
    <TableCell>名称</TableCell>
      <TableCell>状态</TableCell>
      <TableCell>端口</TableCell>
      <TableCell>mount</TableCell>
    </TableRow>
                 </TableHead>
                 <TableBody>
    {filteredData
     .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
     .map((row) => (
         <TableRow key={row.name}>
           <TableCell>
             { props.onUp &&
               <Button onClick={() => props.onUp(row)}>启动</Button>
             }
             { props.onDown &&
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
             {row.status}
           </TableCell>
           <TableCell>
             {row.port}
           </TableCell>
           <TableCell>
             {row.mount}
           </TableCell>
         </TableRow>
     ))}
                 </TableBody>
               </Table>
           </TableContainer>
        <TablePagination
    component="div"
    count={filteredData.length}
    page={page}
    onPageChange={handleChangePage}
    rowsPerPage={rowsPerPage}
    onRowsPerPageChange={handleChangeRowsPerPage}
    style={{ marginTop: '1rem' }}
        />
           </>;
}

export default function Docker() {
    let [installed, set_installed] = useState(false);
    let [dockerlist, update_dockerlist] = useState([]);
    let [open_dialog, set_open_dialog] = useState(false);
    let [open_container_up_dialog, set_open_container_up_dialog] = useState(false);
    let [cur_container, set_cur_container] = useState(null);
    let [data, set_data] = useState({
        title: "",
        env:"",
        config:""
    });
    let get_docker_config = async()=> {
        let read_ret = await api.config_file({filename:'config/docker.config', 'op':"get"});
        if(read_ret.ret == 0 && read_ret.data) {
            let list = JSON.parse(read_ret.data);
            update_dockerlist(list);
        }
    };
    let check_install = async ()=> {
        let ret = await docker.check_install();
        if(ret.ret == 0 && ret.data && ret.data.stdout != '') {
            set_installed(true);
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
                    update_dockerlist(jsonData);
                }
            }
        }
    };
    let install_docker = async () => {
        let install_ret = await docker.install();
        console.log("docker install ret=", install_ret);
        if(install_ret.ret == 0) {
            await check_install();
        }
    };

    let up_container = async(row)=> {
        set_cur_container({...row, op:"start_container"});
        set_open_container_up_dialog(true);
    };

    let down_container = async(row)=> {
        set_cur_container({...row, op:"stop_container"});
        set_open_container_up_dialog(true);
    };
    let Running_Docker = ()=> {
        return <DockerList data={dockerlist} onUp={up_container} onConfig={config_container} onDown={down_container}/>;
    };
    let handleCloseDialog = ()=> {
        set_open_dialog(false);
    };
    let handleSave = async (v)=> {
        let config = jsonEditorFormRef.current.getValue();
        console.log("config==", config);
        let save = await docker.save_config(config);
        console.log("save ret=", save);
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
            let write_ret = await api.config_file({filename:'config/docker.config', 'op':"put", data: JSON.stringify(dockerlist)});
            update_dockerlist(dockerlist);
            set_open_dialog(false);
        }
    };
    let [schema, set_schema] = useState({
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
                "title": "docker配置",
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
    });
    let add = async()=> {
        schema.title = "新建";
        set_schema(schema);
        set_open_dialog(true);
    };
    let config_container = async(row)=> {
        schema.title = "修改容器";
        set_schema(schema);
        let name = row.name;
        let dir = row.dir;
        let ret = await docker.get_config({title:name, dir:dir});
        if(ret.ret  == 0) {
            set_data({
                "title": row.name,
                "env": ret.env.data,
                "config":ret.compose.data
            });
            set_open_dialog(true);
        }
    };
    const jsonEditorFormRef = useRef(null);
    const CustomDialogContent = styled(DialogContent)({
        width: '80%',
    });
    const RenderDialog = () => {
        return (
            <Dialog open={open_dialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
              <DialogTitle>配置</DialogTitle>
              <CustomDialogContent>
                <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={data}/>
              </CustomDialogContent>
              <DialogActions>
                <Button onClick={handleSave}>保存</Button>
                <Button onClick={handleCloseDialog}>取消</Button>
              </DialogActions>
            </Dialog>
        );
    };

    let handle_close_container_up =()=> {
        set_open_container_up_dialog(false);
    };
    useEffect(()=> {
        check_install();
        return ()=> {
        };
    },[]);
    let RenderContainerOp = ()=> {
        return <Dialog open={open_container_up_dialog} onClose={handle_close_container_up} fullWidth maxWidth="md">
                 <DialogTitle>启动容器</DialogTitle>
                 <CustomDialogContent>
                   <ContainOp  data={cur_container}/>
                 </CustomDialogContent>
                 <DialogActions>
                   <Button onClick={handle_close_container_up}>取消</Button>
                 </DialogActions>
               </Dialog>;

    };
    return <Container>
             {!installed &&
              <Button onClick={install_docker}>安装docker</Button>
             }
             {installed &&
              <Button onClick={add}>新建容器</Button>
             }
             <Running_Docker/>
             <RenderDialog/>
             <RenderContainerOp/>
           </Container>;
};
