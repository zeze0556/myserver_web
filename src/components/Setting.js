import React, { useState, useEffect, useRef,useContext } from 'react';

import api from '../api';

import SambaSetting from "./samba";
import RixDynamicComponent from "../rix/RixDynamicComponent.js";
import { Table, Pagination, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, TableContainer,
         TableHead,
         TableRow,
         TableCell,
         TableBody,
         Paper,
         Tab,
         Tabs,
         TablePagination,
         Container,
         Box,
         Modal
       } from '@mui/material';

let paths = {
    'samba': {
        'label': 'samba',
        'rix_type': 'component',
        path: 'components/samba.js',
    },
    'docker': {
        'label': 'docker',
        'rix_type': 'component',
        path: 'components/Docker.js',
    }
};

export default function Setting() {
    const [value, setValue] = React.useState("samba");
    let handleChange = (e,v)=>{
        e.preventDefault();
        setValue(v);
    };
    let Render = (props)=> {
        let one = paths[value];
        if(one) {
            let new_props = {...props,
                             ...one,
                            };
            return <RixDynamicComponent {...new_props} value={value}/>;
        }
        return <></>;
    };
    return <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
             <Tabs value={value} onChange={handleChange} aria-label="setting">
               {Object.keys(paths).map((key) => (
                   <Tab key={key} value={key} label={paths[key].label} />
               ))}
             </Tabs>
             <Render key={value}/>
           </Box>;
}
