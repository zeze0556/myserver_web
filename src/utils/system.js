import React, {forwardRef,useState, Fragment,useEffect, useRef, useContext } from 'react';
import {WindowApi, useWindowManager} from "../rix/RixWindowManager";
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import RixPanel from "../rix/RixPanel";
import RixTable from "../rix/RixTable";
import RixTemplate from "../rix/RixTemplate";
import Config_Schema from "../components/config_schema.js";
import {context_value} from "../store/global_data";
import cmd from "./command.js";
import Disks from "./disks";
import JsonEditorForm from '../components/JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import moment from 'moment';
import axios from 'axios';
const {global_data, api, make_watch_data} = context_value;



const system = {
    config:make_watch_data({config:{}}),
    async get_config() {
        try {
            let config = await api.config_file({ filename: '/app/config.json', 'op': "get"});
            system.config.set("config", config);
            console.log("set config====", config, system.config);
            return config;
        } catch (e) {
            console.log("error===", e);
            return null;
        }
    },
    async save_config(data) {
        await api.config_file({
            op: 'put',
            filename: '/app/config.json',
            data: JSON.stringify(data, null, 2)
        });
        await system.get_config();
    },
    async test_mail() {
        let send_ret = await axios.post('/api/notify', {
            subject: `this is  for test notify from web at ${moment()}`,
            message: `test in system control 这个是中文以及表情符号 🌹`,
            attach: `/app/test.sh`
        });
        console.log("send_ret==", send_ret);
    },
    async edit_auto_start() {
        let filename = '/app/scripts/auto_start.sh';
        let config = await api.config_file({ filename: filename, 'op': "get"});
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;
        let id = 'dialog_'+Date.now();
        let Dialog = (props)=> {
            const jsonEditorFormRef = useRef(null);
            let schema = {
                ...Config_Schema,
                "$ref": "#/definitions/sh_script",
            };
            let save = ()=> {
                let value = jsonEditorFormRef.current.getValue();
                api.config_file({filename, op: 'put', data: value});
                closeDialog(id);
            };
            return <RixDialog className="w-100" id={props.id}>
                <div type="title">自动启动配置</div>
                <div type="content" className="w-100">
                <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
                </div>
                <button type="action" className="button success" onClick={save}> 保存 </button>
                <button type="action" className="button js-dialog-close"> 关闭 </button>
                </RixDialog>;
        };
        openDialog({
            id,
            content: <Dialog id={id}/>
        });
    },
    Setting(props) {
        let [state, update] = useState(0);
        useEffect(()=> {
            let w = system.config.watch("config", ()=> {
                console.log("config update!!!!");
                update(state+1);
            });
            return ()=> {
                system.config.unwatch("config", w);
            };
        });
        let schema = {
            ...Config_Schema,
            "$ref": "#/definitions/system_settings",
        };
        let config = system.config.config;
        console.log("system.config==", system.config);
        const jsonEditorFormRef = useRef(null);
        let save = async ()=> {
            let data = jsonEditorFormRef.current.getValue();
            system.save_config(data);
        };
        let test_mail = async() => {
            system.test_mail();
        };
        let edit_auto_start = ()=> {
            system.edit_auto_start();
        };
        return <div className="w-100 h-100">
            <div type="content">
            <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
            </div>
            <RixButton type="action" className="button success" onClick={test_mail}>测试通知</RixButton>
            <RixButton type="action" className="button success" onClick={save}>保存</RixButton>
            <RixButton type="action" className="button success" onClick={edit_auto_start}>编辑自动启动脚本</RixButton>
            <button type="action" className="button js-dialog-close">关闭</button>
            </div>;

    },
    Render(props) {
        system.get_config();
        return <system.Setting {...props}/>;
    },
    Zram(props) {
        let data = make_watch_data({
            "config": {}
        });
        const jsonEditorFormRef = useRef(null);
        console.log("new zram==", Date.now());
        let schema = {
            ...Config_Schema,
            "$ref": "#/definitions/system_other/zram",
        };
        let get_config = ()=> {
            api.config_file({ filename: '/app/config/zram.config', 'op': "get"}).then(res=> {
                data.set("config", res);
            }).catch(e=> {
            });
        };
        get_config();
        let save = async ()=> {
            let data = jsonEditorFormRef.current.getValue();
            await api.config_file({
                op: 'put',
                filename: '/app/config/zram.config',
                data: JSON.stringify(data, null, 2)
            });
            get_config();
        };
        let SaveButton = ()=> {
            return <RixButton className="button success" onClick={save}>保存</RixButton>;
        };
        let ShowData = ()=> {
            let [state, update] = useState(0);
            let config = data.get("config");
            useEffect(()=> {
                let w = data.watch("config", ()=> {
                    update(state+1);
                });
                return ()=> {
                    data.unwatch("config", w);
                };
            });
            return <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>;
        };
        return <RixPanel collapsible>
            <div type="title">zram</div>
            <SaveButton type="button"/>
            <ShowData/>
            </RixPanel>;
    },
    Other(props) {
        return <div className="w-100 h-100">
            <system.Zram/>
            </div>;
    }
};

export default system;
