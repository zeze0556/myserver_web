import React, {forwardRef,useState, Fragment,useEffect, useRef, useContext } from 'react';
import {useWindowManager} from "../rix/RixWindowManager";
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import Config_Schema from "../components/config_schema.js";
import {context_value} from "../store/global_data";
import cmd from "./command.js";
import Disks from "./disks";
import RixPanel from "../rix/RixPanel";
import JsonEditorForm from '../components/JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import {useData, DataContext, rix_make_watch_data} from "../store/global_data.js";

const {global_data, api} = context_value;

const Persistence = {
    check_ventory() {
        let list = global_data.get('blockdevices', []);
        if(!list) return null;
        let find = list.filter(v=> {
            let children = v.children;
            if(children) {
                let label = children.filter(v2=>v2.label == 'Ventoy')[0];
                if(label) {
                    return true;
                }
            }
            return false;
        });
        return find;
    },
    ventoy: {
        ReplaceBoot(props) {
            let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
            let jsonEditorFormRef = useRef(null);
            let schema = {
                ...Config_Schema,
                "$ref": `#/definitions/bootconfig`
            };
            let onsave = async()=> {
                let value = jsonEditorFormRef.current.getValue();
                let old_config = props.conf_replace;
                let conf_replace = {};
                if(old_config.new) {
                    let config = await api.config_file({ filename: `/tmp/ventoy${old_config.new}`, 'op': "put",
                                                         data: value
                                                       });
                    closeDialog(props.id);
                    return;
                }
                let ventoy_config = props.ventoy_config;
                if(!ventoy_config.conf_replace) {
                    ventoy_config.conf_replace = [];
                }
                await api.run_command({
                    command: 'mkdir',
                    args: ["-p", "/tmp/ventoy/data"]
                });
                conf_replace.new="/data/live_mynas.cfg";
                conf_replace.org="/isolinux/live.cfg";
                conf_replace.iso = old_config.iso;
                await api.config_file({ filename: `/tmp/ventoy${conf_replace.new}`, 'op': "put",
                                        data: value
                                      });

                ventoy_config.conf_replace.push(conf_replace);
                await api.config_file({ filename: '/tmp/ventoy/ventoy/ventoy.json', 'op': "put",
                                        data: JSON.stringify(ventoy_config)
                                      });
                closeDialog(props.id);
            };
            return <RixDialog id={props.id}>
                <div type="title"></div>
                <div type="content">
                <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={props.data} style={{width:"100vh",
                                                                                                  height:"100%",
                                                                                                 }}/>
                </div>
                <button type="action" className="button warning" onClick={onsave}>确定</button>
                <button type="action" className="button js-dialog-close">取消</button>

            </RixDialog>;
        },
        ConfigVentoy(props){
            let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
            let jsonEditorFormRef = useRef(null);
            let [count, update] = useState(0);
            let save_config = (config)=> {
                api.config_file({
                    filename: '/tmp/ventoy/ventoy/ventoy.config',
                    'op': 'put',
                    data: JSON.stringify(config)
                }).then(ret=> {
                    if(ret.ret == 0) {
                        closeDialog(props.id);
                        //mydialog.current.close();
                    }
                });
            };
            let schema = {
                ...Config_Schema,
                "$ref": `#/definitions/ventoy`
            };
            let onsave = async ()=> {
                let value = jsonEditorFormRef.current.getValue();
                let check = JSON.parse(value);
                if(check) {
                    save_config(check);
                }
            };
            return <RixDialog id={props.id}>
                <div type="title"></div>
                <div type="content">
                <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={props.data} style={{width:"100vh",
                                                                                                  height:"100%",
                                                                                                 }}/>
                </div>
                <button type="action" className="button warning" onClick={onsave}>确定</button>
                <button type="action" className="button js-dialog-close">取消</button>

                </RixDialog>;
        }
    },
    download(filename, download_filename){
        api.download_file({filename: filename, 'op': 'get'}).then((response)=> {
            console.log("resp==", response);
            let filename = download_filename;
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            if (window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveOrOpenBlob(blob, filename);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a); // 将 a 链接添加到 body
                a.click(); // 触发下载
                document.body.removeChild(a); // 下载完成后移除 a 链接
            }
        });
    },
    BackupDialog(props) {
        const terminal = useRef(null);
        const shell_ref = useRef(null);
        let [container_up_message, set_container_up_message] = useState("");
        useEffect(()=> {
            setTimeout(()=> {
                terminal.current = new Terminal({
                    //rendererType: 'canvas',
                    rows: 40,
                    convertEol: true,
                    scrollback: 10,
                    disableStdin: false,
                    cursorStyle: 'underline',
                    cursorBlink: true
                });
                const fitAddon = new FitAddon();
                terminal.current.loadAddon(fitAddon);
                terminal.current.onResize((size) => {
                    // 调整 xterm 和 WebSocket 的窗口大小
                    fitAddon.fit();
                });
                terminal.current.open(shell_ref.current);
                cmd.long_cmd({
                    command: '7zr',
                    args:['a', '-t7z', '/tmp/backup.7z', '/etc/', '/app/']
                }, {
                    stdout:(out)=> {
                        if(terminal.current)
                            terminal.current.write(out);
                    },
                    onend:()=> {
                        if(props.onEnd)
                            props.onEnd();
                    }
                });
            }, 100);
        });
        return (<RixDialog>
                <div type="title">压缩中</div>
                <div type="content" ref={shell_ref} width="100%" height="100%">
                </div>
                </RixDialog>);
    },
    VentoySetting(props) {
        let {windows, getApps, openWindow, set_window_ref, openDialog}= useWindowManager();
        let part = props.data.children.filter(v=>v.label == 'Ventoy')[0];
        let self_data = rix_make_watch_data({...part,
                                             mounted: false
                                            });
        let check_mount = async ()=> {
            let res = await api.run_command({
                command: 'bash',
                args: ['-c','mount | grep /tmp/ventoy']
            });
            if(res.data.stdout == '') {
                self_data.set("mounted", false);
            } else {
                self_data.set("mounted", true);
            }

        };
        useEffect(()=> {
            check_mount();
        });
        let Use = ()=> {
            let use = async ()=> {
                await api.run_command({
                    command: 'mkdir',
                    args: ['-p', '/tmp/ventoy']
                });
                let ret = await api.run_command({
                    "command": "mount",
                    "args": [
                        self_data.path,
                        '/tmp/ventoy'
                    ]
                });
                check_mount();
            };
            let unuse = async() => {
                let ret = await api.run_command({
                    "command": "umount",
                    "args": [
                        '/tmp/ventoy'
                    ]
                });
                check_mount();
            };
            let [count, update] = useState(0);
            useEffect(()=> {
                let w = self_data.watch("mounted",()=>{
                    update(count+1);
                });
                return ()=> {
                    self_data.unwatch('mounted');
                };
            });
            if(!self_data.mounted) {
                return <RixButton className="button success" onClick={use}>使用</RixButton>;
            }
            return <RixButton className="button success" onClick={unuse}>卸载</RixButton>;
        };
        let Op = ()=> {
            let [count, update] = useState(0);
            useEffect(()=> {
                let w = self_data.watch("mounted",()=>{
                    update(count+1);
                });
                return ()=> {
                    self_data.unwatch('mounted');
                };
            });
            let configventoy = ()=> {
                let get_config = async ()=> {
                    let config = await api.config_file({ filename: '/tmp/ventoy/ventoy/ventoy.json', 'op': "get" });
                    try {
                        if(config&&!config.ret) {
                            console.log("update config==", config);
                            //JSON.stringify(this.state.modelBody, null, '\t')
                            let data = JSON.stringify(config, null, 2);
                            let id ='dialog_'+Date.now();
                            openDialog({
                                id,
                                content: <Persistence.ventoy.ConfigVentoy id={id} data={data}/>
                            });
                            //update_state({config: JSON.stirngify(config)});
                        }
                    } catch (e) {
                    }
                };
                get_config();
            };
            let replace_boot = async ()=> {
                let config = await api.config_file({ filename: '/tmp/ventoy/ventoy/ventoy.json', 'op': "get" });
                let conf_replace = {};
                if(config&&config.conf_replace) {
                    let f = config.conf_replace.filter(v=>{
                        if(v.iso.endsWith('live-image-amd64.hybrid.iso')) {
                            return true;
                        }
                        return false;
                    })[0];
                    if(f) {
                        conf_replace = f;
                    }
                }
                if(!conf_replace.iso) {
                    let iso = await api.run_command({
                        command: 'find',
                        args: ["/tmp/ventoy -type f -name live-image-amd64.hybrid.iso"]
                    });
                    if(iso.ret == 0) {
                        if(iso.data.stdout != '') {
                            conf_replace.iso = iso.data.stdout;
                        }
                    }
                }
                console.log("conf_replace==", conf_replace);
                if(!conf_replace.iso) {
                    return;
                }
                let default_conf = `
label live-rix-with-persistence-encryption
        menu label ^Live system (rix) without persistence-encryption
        linux /live/vmlinuz
        initrd /live/initrd.img
        append boot=live components persistence persistence-encryption=luks persistence-label=mynas quiet splash pci=noaer pcie_aspm=off ip=frommedia
label live-rix
        menu label ^Live system (rix)
        menu default
        linux /live/vmlinuz
        initrd /live/initrd.img
        append boot=live components persistence persistence-label=mynas quiet splash pci=noaer pcie_aspm=off ip=frommedia

label live-rix-failsafe
        menu label Live system (rix fail-safe mode)
        linux /live/vmlinuz
        initrd /live/initrd.img
        append boot=live components memtest noapic noapm nodma nomce nolapic nosmp nosplash vga=788
`;
                if(conf_replace.new) {
                    let config = await api.config_file({ filename: `/tmp/ventoy${conf_replace.new}`, 'op': "get" });
                    if(config&&!config.ret) {
                        default_conf = config;
                    }
                }
                let id ='dialog_'+Date.now();
                openDialog({
                    id,
                    content: <Persistence.ventoy.ReplaceBoot id={id} data={default_conf} conf_replace={conf_replace} ventoy_config={config}/>
                });
            };
            if(self_data.mounted) {
                return <><RixButton className="button success">创建persestenc镜像</RixButton>
                    <RixButton className="button success">配置挂载persestenc镜像</RixButton>
                    <RixButton className="button success" onClick={replace_boot}>配置启动文件</RixButton>
                    <RixButton className="button success" onClick={configventoy}>配置ventoy</RixButton></>;
            }
            return <>先挂载才能配置</>;
        };
        return <RixPanel collapsible>
            <div type='title'>ventory配置 设备:{props.data.path} 大小:{props.data.size}</div>
            <Use type="button" />
            <div className="w-100" style={{
                "display": "flex",
                "justifyContent": "space-around"
            }}>
            <Op/>
            </div>
            </RixPanel>;
    },
    Setting() {
        let {windows, getApps, openWindow, set_window_ref, openDialog}= useWindowManager();
        let backup = ()=> {
            let id = 'dialog_'+Date.now();
            openDialog({
                id,
                content: <Persistence.BackupDialog onEnd={()=>{Persistence.download('/tmp/backup.7z', 'backup.7z');}}/>
            });
        };
        let state = rix_make_watch_data({
            ventoy: []
        });
        useEffect(()=> {
            let ventoy = Persistence.check_ventory();
            state.set('ventoy', ventoy);
            let w = global_data.watch('blockdevices', ()=> {
                let ventoy = Persistence.check_ventory();
                state.set('ventoy', ventoy);
            });
            return ()=> {
                global_data.unwatch('blockdevices');
            };
        });
        let RendVentoy = ()=> {
            let [count, update] = useState(0);
            useEffect(()=> {
                let w = state.watch('ventoy', ()=> {
                    update(count+1);
                });
                return ()=> {
                    state.unwatch(w);
                };
            });
            let ret = [];
            for(let disk of state.ventoy) {
                ret.push(<Fragment key={disk.path}>
                         <Persistence.VentoySetting data={disk}/>
                         </Fragment>);
            }
            return ret;
        };
        return <div>备份服务器配置
            <RixButton className="button success" onClick={backup}>备份</RixButton>
            <RendVentoy/>
            </div>;

    }
};

export default Persistence;
