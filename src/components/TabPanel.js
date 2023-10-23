import { useState } from 'react';
import { Tab, Tabs, Box } from '@mui/material';

//import Parameters from "./Parameters";
import Setting from "./Setting";
import Home from "./Home";
import Shell from "./Shell";

function TabPanel() {
    const [currentTab, setCurrentTab] = useState('home');

    const handleChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    return (
            <Box>
            <Tabs value={currentTab} onChange={handleChange}>
            <Tab label="Home" value="home"/>
            <Tab label="配置" value="setting"/>
              <Tab label="SHELL" value="shell"/>
            </Tabs>
            {currentTab === 'home' && <div><Home/></div>}
        {currentTab === 'setting' && <div><Setting/></div>}
              {currentTab === 'shell' && <div><Shell/></div>}
        </Box>
    );
}

export default TabPanel;
