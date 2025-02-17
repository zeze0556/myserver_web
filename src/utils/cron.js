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

const {global_data, api, make_watch_data} = context_value;


const cron = {
    async list() {
        let res= await api.run_command({command: "crontab", args:["-l"]});
        if(res.ret == 0) {
            let stdout = res.data.stdout;
            if(stdout.startsWith('no crontab')) {
                return {ret:0, data:[]};
            }
            return {ret:-2, error: res.data.stdout};
        }
        return {ret:-2, error:res};
    },
    async reload_cron() {
        let res = await api.run_command({command: "crontab", args: ['/app/cron/.cron']});
        console.log("reload_cron ret=", res);
    },
    async load_cron() {
        try {
            let old = await api.config_file({ filename: '/app/cron/.cron', 'op': "get"});
            return cron.parse_cron(old);
        } catch (e) {
            return [];
        }
    },
    async save_cron() {
        await Disks.mkdir('/app/cron');
        let new_data = ``;
        cron.cron_list.list.forEach(v=> {
            new_data += `${v.cron} \t bash /app/cron/${v.script}\n`;
        });
        //new_data += `\n`;
        let write_file = await api.config_file({
            op: 'put',
            filename: `/app/cron/.cron`,
            data: new_data
        });
        await cron.reload_cron();
    },
    parse_cron(data) {
        let lines = data.split(`\n`);
        let list = [];
        lines.forEach(v=> {
            let text = v.trim().split(/\s+/);
            if(text.length > 6) {
                let cron = ``;
                let i = 0;
                for(i = 0; i < 5; i++) {
                    cron += `${text[i]} `;
                }
                i++;
                let script = text[i];
                list.push({cron, script});
            }
        });
        console.log("set_list===", list);
        cron.cron_list.set("list", list);
    },
    CronScriptRemove(props) {
        let old_list = cron.cron_list.list;
        let index =old_list.findIndex(v=>v.script == props.filename);
        if(index >= 0) {
            old_list.splice(index, 1);
        }
        cron.save_cron();
        Disks.rm(props.filename);
        cron.cron_list.set("list", old_list);
    },
    CronScriptEdit(props) {
        let {filename, data} = props;
        console.log("CronScriptEdit props=", props);
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;
        let schema = {
            ...Config_Schema,
            "$ref": "#/definitions/cron_edit_script",
        };
        let id = 'dialog_'+Date.now();
        let save_data = async (newdata)=> {
            let new_cron = newdata.cron;
            let script = newdata.script;
            let write_file = await api.config_file({
                op: 'put',
                filename: `${filename}`,
                data: script
            });
            if(new_cron != props.cron) {
                let old_list = cron.cron_list.list;
                let index =old_list.findIndex(v=>v.script == filename);
                if(index >= 0) {
                    old_list.splice(index, 1, {
                        cron:new_cron, script: filename
                    });
                }
                cron.save_cron();
                cron.cron_list.set("list", old_list);
            }
            closeDialog(id);
        };
        let config = {
            cron: props.cron,
            script: data
        };
        let Dialog = ()=> {
            const jsonEditorFormRef = useRef(null);
            let save = ()=> {
                let data = jsonEditorFormRef.current.getValue();
                save_data(data);
            };
            return <RixDialog width="fit-content">
                <div type="title">编辑脚本</div>
                <div type="content">
                <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>
                </div>
                <RixButton type="action" className="button success" onClick={save}>保存</RixButton>
                <button type="action" className="button js-dialog-close">关闭</button>
                </RixDialog>;
        };
        openDialog({
            id,
            content: <Dialog id={id}/>
        });
    },
    CronDialog(props){
        let { title, data} = props;
        let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;
        let schema = {
            ...Config_Schema,
            "$ref": "#/definitions/cron_add",
        };
        let id = 'dialog_'+Date.now();
        let save_data = async (newdata)=> {
            console.log("save_newdata=", newdata);
            let old_list = cron.cron_list.list;
            old_list.push({
                cron: newdata.cron,
                script: `/app/cron/${newdata.script}`
            });
            await cron.save_cron();
            cron.cron_list.set("list", old_list);
            closeDialog(id);
        };
        let Dialog = ()=> {
            const jsonEditorFormRef = useRef(null);
            let save = ()=> {
                let data = jsonEditorFormRef.current.getValue();
                save_data(data);
            };
            return <RixDialog width="fit-content">
                <div type="title">{title}</div>
                <div type="content">
                <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={data}/>
                </div>
                <RixButton type="action" className="button success" onClick={save}>保存</RixButton>
                <button type="action" className="button js-dialog-close">关闭</button>
                </RixDialog>;
        };
        openDialog({
            id,
            content: <Dialog id={id}/>
        });
    },
    cron_list: make_watch_data({
        list:[]
    }),
    Render(props) {
        if(cron.cron_list.list.length == 0) {
            cron.load_cron();
        }
        let ShowCron  = ()=> {
            let [state, update] = useState(0);
            useEffect(()=> {
                let w = cron.cron_list.watch('list', ()=> {
                    console.log("change!!!!", state);
                    update(state+1);
                });
                return ()=> {
                    cron.cron_list.unwatch('list', w);
                };
            });
            console.log("list==", cron.cron_list, cron.cron_list.get('list'));
            let data = cron.cron_list.list;//make_watch_data({list:[]});
            let edit = (row)=> {
                api.config_file({ filename: row.script, 'op': "get"}).then(res=> {
                    cron.CronScriptEdit({
                        filename: row.script,
                        data: res,
                        cron: row.cron
                    });
                }).catch(e=> {
                    cron.CronScriptEdit({
                        filename: row.script,
                        data: `#!/bin/bash\n`,
                        cron: row.cron
                    });
                });
            };
            let remove = (row)=> {
                cron.CronScriptRemove({
                    filename: row.script,
                    cron: row.cron
                });
            };
            let Actions = ({row})=> {
                return <div className="dropdown-button">
                    <RixButton className="button dropdown-toggle" style={{width:"fit-content"}}>操作</RixButton>
                    <ul className="d-menu" data-role="dropdown">
                    <li><RixButton className="button success" onClick={()=>{edit(row);}}>编辑</RixButton></li>
                    <li><RixButton className="button alert" onClick={()=>{remove(row);}}>删除</RixButton></li>
                    </ul>
                    </div>;
            };
            return <RixTable data={data}>
                <RixTable.TableColumn lable="编辑">
                <RixTemplate slot-scope="{row}">
                <Actions/>
                </RixTemplate>
                </RixTable.TableColumn>
                <RixTable.TableColumn label="定时器" prop="cron">
                </RixTable.TableColumn>
                <RixTable.TableColumn label="脚本" prop="script">
                </RixTable.TableColumn>
                </RixTable>;
            return data.map((cron, index)=> {
                return <div key={index}>{cron}</div>;
            });
        };
        let add = ()=> {
            cron.CronDialog({title:"添加任务", data:{}});
        };
        let add_default = ()=> {
        };
        return <div style={{'height':'100%'}}>
            <RixButton className="button success" onClick={add}>添加</RixButton>
            <RixButton className="button success" onClick={add_default}>添加默认任务</RixButton>
            <ShowCron/></div>;
    }

};

export default cron;
