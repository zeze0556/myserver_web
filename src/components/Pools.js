import React, { useState, useEffect, useRef,useContext } from 'react';
import api from '../api';
import { styled } from '@mui/system';
import { Table, Pagination, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, TableContainer,
         TableHead,
         TableRow,
         TableCell,
         TableBody,
         Paper,
         TablePagination,
       } from '@mui/material';
import bcachefs from '../utils/bcachefs.js';
import {rix_make_watch_data, DataContext} from "../store/global_data.js";
import BlockDevice from "./BlockDevice";

function Pool(props) {
    
    let pool = props.data;
    console.log("pool=", pool);
    const global_data = useContext(DataContext);
    const [labels, update_labels] = useState([]);
    useEffect(()=> {
        update_labels(props.data.label);
    },[props.data]);

    let onDown = (row)=> {
        console.log("down==", row);
    };
    let onRemove = async (row)=> {
        let ret = await api.run_command(bcachefs.device.evacuate({
            device: row.path,
            mount_path: pool.mount_path,
        }));
        if(ret.ret == 0) {
            let remove_ret = await api.run_command(bcachefs.device.remove({
                device: row.path,
                mount_path: pool.mount_path,
            }));
            if(remove_ret.ret == 0) {
                let index = pool.label.findIndex(v=>v.path == row.path);
                if(index>=0) {
                    pool.label.splice(index, 1);
                }
                let pools = global_data.get('pools');
                index = pools.findIndex(v=>v.name === pool.name);
                if(index>=0) {
                    pools.splice(index,1,pool);
                }
                let write_ret = await api.config_file({filename:'config/pools.config', 'op':"put", data: pools});
                if(write_ret.ret == 0) {
                    update_labels(pool.label);
                    global_data.set('pools', pools);
                }
            }
        }
    };



    let Status = ()=> {
        const [poolstatus, set_poolstatus] = useState({online:false,
                                                       status_text: "离线"
                                                      });
        let mount_status = async ()=> {
            let mount_path = pool.mount_path;
            let ret = await api.run_command(bcachefs.fs.usage(mount_path));
            if(ret.ret == 0) {
                let stdout = ret.data.stdout.split(`\n`);
                set_poolstatus({online: true,
                                status_text: "在线"
                               });
            } else {
                set_poolstatus({online: false,
                                status_text: "离线"
                               });
            }
        };
        let mount = async (e)=> {
            e.preventDefault();
            let ret = await api.run_command(bcachefs.mount(pool));
            await mount_status();

        };

        let umount = async (e)=> {
            e.preventDefault();
            let ret = await api.run_command(bcachefs.umount(pool));
            await mount_status();
        };
        useEffect(()=> {
            //setParameters(pool.label);
            let timer = setInterval(()=> {
                mount_status();
            }, 60*1000);
            mount_status();
            return ()=> {
                //global_data.unwatch('sysstate', sysdata_update);
                clearInterval(timer);
            };
        },[]);
        return <div>名称:{pool.name} 挂载位置: {pool.mount_path} 状态:
                 {poolstatus.online &&
                  <Button onClick={umount}>卸载</Button>
                 }
                 {!poolstatus.online &&
                  <Button onClick={mount}>挂载</Button>
                 }</div>;
    };

    return <div>
             <Status/>
             <BlockDevice data={labels} onDown={onDown} onRemove={onRemove}/>;
        </div>;
};

export default Pool;
