import React, { useState, useEffect, useRef, useContext, forwardRef } from 'react';
import { styled } from '@mui/system';

import {
    Table, Pagination, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, TableContainer,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    TablePagination,
    Container,
    Box,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Modal
} from '@mui/material';
import {
    DesktopWindows, Settings, Notifications,
    Close, Restore,
    Menu,
    Home,
    ChevronLeft,
    Maximize, Minimize
} from '@mui/icons-material';

import { useData } from "../store/global_data.js";


const CommonWindow = forwardRef((props, ref) => {
    const { onActive, onClose, onRestore, onMaximize, onMinimize } = props;
    return <><AppBar sx={{ position: 'relative' }}>
        <Toolbar
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
            }}
        >
            <Typography variant="h6" component="div" sx={{
                flexGrow: 1,
                cursor: 'move',
            }}
                className="window-title"
                onClick={onActive}
            >
              {props.title}
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
        {props.children}
    </>;

});

export default CommonWindow;
