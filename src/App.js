import { useState, useEffect} from 'react';
import { RixWindowManagerProvider } from './rix/RixWindowManager';
import "./App.css";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Desktop from './components/Desktop';
import Login from './components/Login';
import { DataProvider, useData } from "./store/global_data";
import axios from 'axios';
const theme = createTheme();
function App() {
    let Render = ()=> {
        const {global_data} = useData();
        const [state, setState] = useState({login:false});
        let check_login = async () => {
            const response = await axios.post('/api/userinfo');
            let ret = response.data;
            if (ret.ret == 0) {
                global_data.set('user', { username: ret.data.username });
            }
        };
        useEffect(() => {
            let w = (v)=> {
                setState({login:true});
            };
            global_data.watch('user', w);
            check_login();
            return ()=> {
                global_data.unwatch('user', w);
            };
        },[]);
        if(state.login) {
            return (<RixWindowManagerProvider>
                      <Desktop />
                    </RixWindowManagerProvider>);
        } else {
            return (<Login/>);
        }
    };
    return (
        <ThemeProvider theme={theme}>
              <DataProvider>
                <Render/>
              </DataProvider>
        </ThemeProvider>
    );
}

export default App;
