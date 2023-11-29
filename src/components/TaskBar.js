// TaskBar.js
import React, { useState,Fragment } from 'react';
import { Box, Paper, IconButton, Avatar, Drawer,Typography,
         Popover,
         List,
         ListItem,
         ListItemIcon,
         ListItemText,
         AppBar,
         Toolbar,
       } from '@mui/material';
import { DesktopWindows, Settings, Notifications,
         Maximize,
         Menu,
         Minimize,
         Restore
       } from '@mui/icons-material';

import { useWindowManager } from './WindowManager';

const TaskBar = (props) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [startMenuAnchorEl, setStartMenuAnchorEl] = useState(null);
    const { getApps, activeApp } = useWindowManager();
    const handleSidebarToggle = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    const handleSidebarClose = () => {
        setSidebarOpen(false);
    };
    const handleStartMenuClick = (event) => {
        setStartMenuAnchorEl(event.currentTarget);
    };

    const handleStartMenuClose = () => {
        setStartMenuAnchorEl(null);
    };
    let {apps} = props;

    const [isSettingsOpen, setSettingsOpen] = useState(false);

    const handleSettingsToggle = () => {
        setSettingsOpen(!isSettingsOpen);
    };
    let onOpenApp = (app)=> {
        handleStartMenuClose();
        if (props.onOpenApp) props.onOpenApp(app);
    };

    return (
        <Box
            display="flex"
            justifyContent="flex-start"
            alignItems="center"
            position="elative"
            bottom={0}
            width="100%"
            p={1}
            bgcolor="primary.main"
            color="white"
        zIndex={3}
        >
            {/* 窗口图标 */}
          <IconButton color="inherit" onClick={handleStartMenuClick} sx={{width:60, height:60}}>
                <DesktopWindows />
            </IconButton>
            <Popover
                PaperProps={{ sx: { left: 0 } }} // 设置 Paper 的样式
        marginThreshold={0}
        elevation={0}
                open={Boolean(startMenuAnchorEl)}
                anchorEl={startMenuAnchorEl}
                onClose={handleStartMenuClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <List>
                  {Object.keys(apps).map(app=>
                      <ListItem button onClick={()=>onOpenApp(app)}>
                          <Fragment key={app} >
                          {apps[app].icon &&
                           <>
                             {apps[app].icon}
                           </>
                          }
                            <ListItemText primary={`${apps[app].title}`} />
                          </Fragment>
                      </ListItem>
                    )}
                </List>
            </Popover>
            {/* 应用图标*/}
          <Paper sx={{ p: 1, cursor: 'pointer',
                       width: '100%',
                       position: 'relative',
                       display: 'flex',
                       justifyContent:"space-around",
                       alignItems: "flex-start",
                     }} >
              {
                  getApps().map((app)=>{
                      return <Fragment key={app.id}>
                               {window.icon?window.icon: <IconButton color="inherit" onClick={()=>activeApp(app.id)}><div>{app.title}</div></IconButton>}
                             </Fragment>;
                  })}
            </Paper>

            {/* 状态图标（示例中只有一个通知图标） */}
          <IconButton color="inherit" onClick={handleSidebarToggle} sx={{right:0, positon:'absolute'}}>
                <Notifications />
            </IconButton>
            {/* 侧边栏 */}
            <Drawer anchor="right" open={isSidebarOpen} onClose={handleSidebarClose} sx={{ position: 'fixed', top: 0, height: 'calc(100vh - 48px)', zIndex:2 }}>
                {/* 侧边栏内容，根据实际需求进行扩展 */}
                <Box sx={{ width: '250px', padding: '16px', height: '100%' }}>
                    <Typography>这是侧边栏内容</Typography>
                </Box>
            </Drawer>

{/* 应用窗口 */}
      <Drawer
        anchor="top"
        open={isSettingsOpen}
        onClose={handleSettingsToggle}
        sx={{ flexShrink: 0, width: '100vw', height: 'calc(100vh - 40px)', zIndex:1 }}
                PaperProps={{ sx: { width: '100vw', height: 'calc(100vh - 40px)', marginLeft: 0 } }} // 设置窗口的样式
      >
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              onClick={handleSettingsToggle}
              sx={{ mr: 2 }}
            >
              <Menu />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Settings
            </Typography>
            <IconButton color="inherit" onClick={() => alert('最小化')}>
              <Minimize />
            </IconButton>
            <IconButton color="inherit" onClick={() => alert('最大化')}>
              <Maximize />
            </IconButton>
            <IconButton color="inherit" onClick={() => alert('还原')}>
              <Restore />
            </IconButton>
          </Toolbar>
        </AppBar>
        {/* 窗口内容 */}
        <Box p={2}>
          {/* ... 窗口内容 */}
        </Box>
      </Drawer>
        </Box>
    );
};

export default TaskBar;
