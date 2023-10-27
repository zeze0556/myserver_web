import { useState, useEffect, useContext } from 'react';
import { Tab, Tabs, Box } from '@mui/material';
import {DataContext} from "../store/global_data.js";
import RixDynamicComponent from "../rix/RixDynamicComponent.js";
import axios from 'axios';

let paths = {
    'home': {
        'rix_type': 'component',
        path: 'components/Home.js',
    },
    'setting': {
        'rix_type': 'component',
        path: 'components/Setting.js',

    },
    'shell': {
        'rix_type': 'component',
        path: 'components/Shell.js',

    },
    'login': {
        'rix_type': 'component',
        path: 'components/Login.js',
    }
};

function TabPanel() {
    const [currentTab, setCurrentTab] = useState('login');
    const [login, update_login] = useState({});
    const global_data = useContext(DataContext);
    let check_login = async ()=> {
        const response = await axios.post('/api/userinfo');
        let ret = response.data;
        if(ret.ret == 0) {
            global_data.set('user', {username: ret.data.username});
        }
    };
    useEffect(()=> {
        let w = (v)=> {
            setCurrentTab('home');
        };
        global_data.watch('user', w);
        check_login();
        return ()=> {
            global_data.unwatch('user', w);
        };
    },[]);
    const handleChange = (event, newValue) => {
        setCurrentTab(newValue);
    };
    let Render = (props)=> {
        let one = paths[currentTab];
        if(one) {
            let new_props = {...props,
                             ...one,
                            };
            return <RixDynamicComponent {...new_props}/>;
        }
        return <></>;
    };
    let Render_All=(props)=> {
        if(currentTab == 'login') {
            let new_props = {...props,
                             ...paths['login'],
                            };
            return <RixDynamicComponent {...new_props}/>;
        } else {
            return <><Tabs value={currentTab} onChange={handleChange}>
              <Tab label="Home" value="home"/>
              <Tab label="配置" value="setting"/>
              <Tab label="SHELL" value="shell"/>
            </Tabs>
            <Render/>
                   </>;
        }
    };
    return (<Box><Render_All/></Box>);
}

export default TabPanel;
