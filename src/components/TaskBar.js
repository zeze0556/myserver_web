// TaskBar.js
import React, {useState, useEffect, useRef, useContext, forwardRef, useImperativeHandle, Fragment } from 'react';
import parse from 'html-react-parser';
import { useWindowManager } from '../rix/RixWindowManager';

const TaskBar = forwardRef((props, ref) => {
    let [state, setState] = useState({
        tasks:[],
        menus:props.menus||[],
    });
    let update_state = (v) => {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };
    const { windows, opeWindow, getApps, activeApp } = useWindowManager();
    useEffect(()=> {
        let f = windows.watch("wins",(v)=>{
            let apps = windows.wins;
            let tasks = [];
            for(let i in apps) {
                tasks.push(apps[i]);
            }
            update_state({tasks});
            //setUpdate(update+1);
        });
        return ()=> {
            windows.unwatch("wins", f);
        };
    });
    let task_click= (v)=> {
        activeApp(v);
    };
    //let {apps} = props;
    
    return(<div className="task-bar">
                <div className="task-bar-section">
                <button className="task-bar-item" id="start-menu-toggle"><span className="mif-windows"></span></button>
                <div className="start-menu" data-role="dropdown" data-toggle-element="#start-menu-toggle">
                <div className="start-menu-inner">
                <div className="explorer">
                <ul className="v-menu w-100 bg-brandColor2 fg-white">
                {state.menus}
            </ul>
                </div>
                </div>
                </div>
                </div>
                <div className="task-bar-section tasks">{state.tasks.map((v)=>{
                    return (<span className="task-bar-item started" key={v.id} onClick={(e)=>task_click(v.id, e)}>
                            {v.icon}
                            </span>);
                })}
                </div>
                  <div className="task-bar-section system-tray ml-auto">
                    <button className="task-bar-item" onClick={props.charms_toggle}><span className="mif-comment"></span></button>
                    <span style={{lineHeight: "40px"}} className="pr-4">
                      <span data-role="clock" className="w-auto fg-white reduce-1" data-show-date="false"></span>
                    </span>
                  </div>
                </div>
        );
/*
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

          <IconButton color="inherit" onClick={handleSidebarToggle} sx={{right:0, positon:'absolute'}}>
                <Notifications />
            </IconButton>
            <Drawer anchor="right" open={isSidebarOpen} onClose={handleSidebarClose} sx={{ position: 'fixed', top: 0, height: 'calc(100vh - 48px)', zIndex:2 }}>
                <Box sx={{ width: '250px', padding: '16px', height: '100%' }}>
                    <Typography>这是侧边栏内容</Typography>
                </Box>
            </Drawer>

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
        <Box p={2}>
        </Box>
      </Drawer>
        </Box>
    );
*/
});

export default TaskBar;
