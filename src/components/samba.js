import React, { useState, useEffect, useRef,useContext } from 'react';
import samba from '../utils/samba';
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
    const jsonEditorFormRef = useRef(null);
    let init = async()=> {
        let conf = await samba.get_config();
        console.log("conf==", conf);
        update_content(conf);
    };
    useEffect(()=> {
        init();
    },[]);

    let update_config = async()=> {
        try {
            let config = jsonEditorFormRef.current.getValue();
            console.log("new config==", config);
            let conf = await samba.save_config(config);
            update_content(conf);
        } catch (e) {
            console.log("update samba error", e);
        }
    };

    let restart = async()=> {
        await samba.restat();
    };
    return <Container style={{width:"100vh",
                              height:"100%",
                             }}>
        <JsonEditorForm schema={schema}
                        data={content}
                        ref={jsonEditorFormRef} 
                        style={{width:"100vh",
                                height:"100%",
                               }} />
             <Button onClick={update_config}>更新</Button>
             <Button onClick={restart}>重启</Button>
           </Container>;
}
