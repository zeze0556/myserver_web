import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    Box, Typography, Button,
    Drawer,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    AppBar as MuiAppBar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Toolbar,
    IconButton,
} from '@mui/material';
import { styled } from '@mui/system';
import {
    Settings,
    Close, Restore,
    Menu,
    Home,
    ChevronLeft,
    Maximize, Minimize
} from '@mui/icons-material';

import { useData } from "../store/global_data.js";
import JsonEditorForm from './JsonEditorForm';

const drawerWidth = 240;
const CustomDialogContent = styled(DialogContent)({
    width: '80%',
});

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => {
        let ret = {
        flexGrow: 1,
        padding: theme.spacing(3),
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        marginLeft: `-${drawerWidth}px`,
        ...(open && {
            transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: 0,
        }),
        };
        return ret;
    },
);

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: `${drawerWidth}px`,
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
}));

const VirtualMachine = (props) => {
    const { global_data, api } = useData();
    const [state, setState] = useState({
        drawOpen:false,
        openAddDialog: false,
        schema:{},
    });
    const { onActive, onClose, onRestore, onMaximize, onMinimize } = props;
    let update_state = (v) => {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };
    const jsonEditorFormRef = useRef(null);
    let add_virtual = ()=> {
    };
    return <><AppBar open={state.drawOpen} sx={{ position: 'relative' }}>
<Toolbar
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
            }}
        >
            <IconButton edge="start" color="inherit" onClick={() => { update_state({drawOpen: !state.drawOpen }); }} sx={{ mr: 2, ...(state.drawOpen&& { display: 'none' }) }}>
            <Menu />
        </IconButton>
            <Typography variant="h6" component="div" sx={{
                flexGrow: 1,
                cursor: 'move',
            }}
                className="window-title"
                onClick={onActive}
            >
                虚拟机管理
            </Typography>
            <IconButton color="inherit" onClick={onMinimize}>
                <Minimize />
            </IconButton>
            {props.isMaximized ? (
                <IconButton color="inherit" onClick={onRestore}>
                    <Restore />
                </IconButton>
            ) : (
                <IconButton color="inherit" onClick={onMaximize}>
                    <Maximize />
                </IconButton>
            )}
            <IconButton color="inherit" onClick={onClose}>
                <Close />
            </IconButton>
        </Toolbar>
    </AppBar>
        <Box p={2}
             sx={{display:'flex'}}
        >
          <Drawer anchor="left" open={state.drawOpen} onClose={()=>{}}
                  sx={{ width:drawerWidth,
                      flexShrink: 0,
                      '& .MuiDrawer-paper': {
                          width: drawerWidth,
                          boxSizing: 'border-box',
                      },
                      }}
            variant="persistent"
          >
                <DrawerHeader>
                    <IconButton onClick={() => { update_state({drawOpen: !state.drawOpen }); }}>
                        <ChevronLeft/>
                    </IconButton>
                </DrawerHeader>

                <Divider />
                <List>
                    <ListItem button onClick={() => { update_state({ all_disk: true, show_pools: false}); }}>
                        <ListItemIcon>
                            <Home/>
                        </ListItemIcon>
                        <ListItemText primary="所有虚拟机" />
                    </ListItem>
                  <ListItem button onClick={add_virtual}>
                        <ListItemIcon>
                            <Settings />
                        </ListItemIcon>
                        <ListItemText primary="添加虚拟机" />
                    </ListItem>

                </List>
    </Drawer>
          <Main open={state.drawOpen}>
          </Main>
        </Box>
    </>;
};

export default VirtualMachine;
