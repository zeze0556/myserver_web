import React, { useState, useEffect, useRef,useContext } from 'react';
import api from '../api';
import JsonEditorForm from './JsonEditorForm';

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


export default function SambaSetting() {
    let [content,update_content] = useState("");
    const [schema, setSchema] = useState({
        "type": "string",
        "format": "textarea",
        "title": "samba配置",
        "default": "",
        "options": {
            "input_height": "500px",
            //"style": {height:"100vh"}
        }
    });
    let init = async()=> {
        let conf = await api.config_file({
            'op': 'get',
            'filename': '/etc/samba/smb.conf'
        });
        if(conf.ret == 0) {
            update_content(conf.data);
        }
    };
    useEffect(()=> {
        init();
    },[]);

    return <Container style={{width:"100vh",
                              height:"100%",
                             }}>
        <JsonEditorForm schema={schema} data={content} style={{width:"100vh",
                                                               height:"100%",
                                                              }} /></Container>;
}
