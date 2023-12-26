// Desktop.js
import React, { Fragment, useRef, useState, useEffect } from 'react';
import {  Box, Paper, Typography,
       } from '@mui/material';
import TaskBar from './TaskBar';
import { styled } from '@mui/system';
import { useWindowManager } from './WindowManager';
import RixDynamicComponent from "../rix/RixDynamicComponent.js";
import { useData } from "../store/global_data.js";

const paths = {
    'systemsetting': {
        'rix_type': 'component',
        'title': '系统设置',
        path: 'components/SystemSetting.js',
    },
    'storagewindow': {
        'rix_type': 'component',
        'title': '存储管理',
        path: 'components/StorageWindow.js',
    },
    'shell': {
        'title': '终端',
        'rix_type': 'component',
        path: 'components/Shell.js',
    },
    'docker': {
        'title': 'Docker',
        'rix_type': 'component',
        path: 'components/Docker.js',
    },
    'samba': {
        'title': '共享服务',
        'rix_type': 'component',
        path: 'components/samba.js'
    },
    'virtualmachine': {
        'title': '虚拟机管理',
        'rix_type': 'component',
        path: 'components/VirtualMachine.js'
    }
};


const Desktop = () => {
    const { windows, openWindow} = useWindowManager();
    const { global_data, api } = useData();
    let [state, setState] = useState({
        apps:paths,
        alert: []
    });
    let update_state = (v) => {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };

    const window_zone_ref = useRef(null);

    let OpenApp=(id)=> {
        let new_props = {
            //...props,
            ...paths[id],
        };
        openWindow(window_zone_ref, id, paths[id].title, <RixDynamicComponent {...new_props} />);
    };
    useEffect(() => {
        let alert_set = (v) => {
            update_state({ alert: v });
        };
        global_data.watch("alerts", alert_set);
        return () => {
            global_data.unwatch('alerts', alert_set);
        };
    },[]);

    return (
        <Box height="100vh"
            display="flex"
            flexDirection="column"
            overflow="auto">
            {/* 桌面应用快捷方式 */}
            <Box sx={{
                display: "flex",
                height: 'calc(100vh - 60px)',
                width: '100vw',
                flexWrap: 'wrap',
                overflow: 'auto',
                padding: 0,
            }}
                flexDirection="column" justifyContent="flex-start" alignItems="flex-start" p={2}
                alignContent="flex-start"
                 ref={window_zone_ref}
            >
                {Object.keys(paths).map(i => 
                    <Paper key={i} onClick={() => OpenApp(i)}
                        sx={{ p: 2, cursor: 'pointer', mb: 2, mr: 0 }}
                    >
                        <Typography variant="h6">{`${paths[i].title}`}</Typography>
                    </Paper>
                )}
                {/* 打开的窗口 */}
                {windows.map((window) => {
                    return <Fragment key={window.id}
                    >
                        {window.content}
                    </Fragment>;
                })}

            </Box>
          { state.alert.map((alert)=> {
              return <Fragment key={alert.id}>{alert.content}</Fragment>;
          })}
            {/* 任务栏 */}
          <TaskBar apps={state.apps} onOpenApp={OpenApp}/>
        </Box>
    );
};

export default Desktop;
