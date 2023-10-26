import { useState, useContext, useEffect} from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import { Menu as MenuIcon, Home as HomeIcon, Settings as SettingsIcon } from '@mui/icons-material';
import {DataContext} from "../store/global_data.js";
function Navigation() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [enable, update_enable] = useState(false);
    const global_data = useContext(DataContext);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
    useEffect(()=> {
        let my_set = (v)=> {
            update_enable(v);
        };
        global_data.watch('navigation_enable',my_set);
        return ()=> {
            global_data.unwatch('navigation_enable',my_set);
        };
    },[]);

    let Render = ()=> {
        if(enable) {
            return <div>
                     <IconButton edge="start" color="inherit" onClick={toggleDrawer}>
                       <MenuIcon />
                     </IconButton>
                     <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer}>
                       <List>
                         <ListItem button>
                           <ListItemIcon>
                             <HomeIcon />
                           </ListItemIcon>
                           <ListItemText primary="Home" />
                         </ListItem>
                         <ListItem button>
                           <ListItemIcon>
                             <SettingsIcon />
                           </ListItemIcon>
                           <ListItemText primary="Settings" />
                         </ListItem>
                       </List>
                     </Drawer>
                   </div>;
        }
        return <></>;
    };

  return <Render/>;
}

export default Navigation;
