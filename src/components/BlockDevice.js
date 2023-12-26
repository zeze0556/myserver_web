import React, { useState, useEffect, useRef,useContext } from 'react';
//import api from '../api';
import { styled } from '@mui/system';
import { Table, Pagination, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, TableContainer,
         TableHead,
         TableRow,
         TableCell,
         TableBody,
         Paper,
         TablePagination,
       } from '@mui/material';

import {useData} from "../store/global_data.js";


function BlockDevice(props){
    //const [disks, update_disks] = useState([...props.data]);

    const { global_data, api } = useData();
    const [data, update_data] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [poolstatus, set_poolstatus] = useState({
        online: false,
        status_text: "离线"
    });
    const [config, setConfig] = useState({
        data: [],
        disks: props.data || [],
    });
    let update_state = (v) => {
        setConfig((prev) => {
            return { ...prev, ...v };
        });
    };
    const [filter, setFilter] = useState('');
    const filteredData = config.disks.filter((row) => {
        return Object.values(row).some((value) => {
            return value.toString().toLowerCase().includes(filter.toLowerCase());
        });
    });
    useEffect(()=> {
        update_state({disks:props.data});
        let blockdevices = global_data.get('blockdevices');
        let sysdata_update = (v)=> {
            let blockdevices = global_data.get('blockdevices');
            //let v = global_data.get('sysstat', []);
            //Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
            let label = data;
            let old_data = [...config.disks,
                            //...props.data
                           ];
            for(let disk of props.data) {
                let index = old_data.findIndex(v=>v.path == disk.path);
                if(index < 0) {
                    old_data.push(disk);
                }
            }
            let status = v;//v.hosts[0].statistics[0].disk;
            label.forEach(one=>{
                let d = status.filter(v=>{
                    if(one.path == `/dev/${v.Device}`) return true;
                    return false;
                })[0];
                if(!blockdevices) return;
                let block = blockdevices.filter(v=>v.path === one.path)[0];
                if(d&&block) {
                    let index = old_data.findIndex(v=>v.path == one.path);
                    if(index >= 0) {
                        old_data.splice(index, 1, {
                            ...block,
                            id: one.path,
                            ...d
                        });
                    } else {
                        old_data.push({
                            ...block,
                            id: one.path,
                            ...d
                        });
                    }
                }
            });
            update_state({disks:[...old_data]});
        };
        //sysdata_update([]);
        global_data.watch('sysstat', sysdata_update);
        //update_disks(data);
        return ()=> {
            global_data.unwatch('sysstat', sysdata_update);
        };
    },[props.data]);
    /*
    useEffect(()=> {
        console.log("props===", props);
        //if(props.data)
        //update_data(props.data);
    },[props.data]);
    */
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
    return <>
         <TableContainer component={Paper}>
           <Table>
             <TableHead>
               <TableRow>
                 <TableCell>设备</TableCell>
                 <TableCell>PATH</TableCell>
                 <TableCell>标识</TableCell>
                 <TableCell>容量</TableCell>
                 <TableCell>读取</TableCell>
                 <TableCell>写入</TableCell>
               </TableRow>
             </TableHead>
             <TableBody>
               {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                    <TableRow key={row.path}>
                      <TableCell>
                        { props.onDown &&
                        <Button onClick={() => props.onDown(row)}>下线</Button>
                        }
                        { props.onAdd&&props.check_add_status&&props.check_add_status(row) &&
                          <Button onClick={() => props.onAdd(row)}>添加到池</Button>
                        }
                        { props.onRemove &&
                        <Button onClick={() => props.onRemove(row)}>移除</Button>
                        }
                      </TableCell>
                      <TableCell>{row.path}</TableCell>
                      <TableCell>{row.model} {row.serial} {row.size}</TableCell>
                      <TableCell>{row.size}</TableCell>
                      <TableCell>{row["kB_read/s"]}</TableCell>
                      <TableCell>{row["kB_wrtn/s"]}</TableCell>
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
};

export default BlockDevice;
