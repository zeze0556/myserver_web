import React, {useState, useEffect, useRef, useContext, forwardRef, useImperativeHandle, Fragment } from 'react';
import ReactDOM from 'react-dom/client';
import { DataProvider, useData,rix_make_watch_data, DataContext, context_value } from "../store/global_data.js";
import RixSelect from "../rix/RixSelect";
import {Autocomplete, TextField} from '@mui/material';

let JSONEditor = window.JSONEditor;

class Disk_Select_Without_Part extends JSONEditor.AbstractEditor{
    build() {
        let value = this.value;
        let self = this;
        this.title = this.header = this.label = this.theme.getFormInputLabel(this.getTitle(), this.isRequired());
        this.container.appendChild(this.title);
        let select_options = this.options;
        let disks = this.options.disks;
        if(!disks) {
            const {global_data, api, make_watch_data} = context_value;
            let list = global_data.get('blockdevices').filter(v=>v.type == 'disk' &&v.id);
            let canuse = [];
            for (let disk of list) {
                if(!select_options.part_check) {
                    canuse.push(disk);
                    continue;
                }
            }
            disks = canuse;
        }
        this.disks = disks;
        const div = document.createElement('div');
        this.container.append(div);
        this.view_root = ReactDOM.createRoot(div);
        this.rix_init_flag = false;
        let onChange = (e, v)=> {
            e.preventDefault();
            let disk = disks.filter(v2=>v2.path ==v)[0];
            if(disk) {
                let real_v = disk[select_options?.get_prop??'path'];
                this.setValue(real_v, false, false);
            }
        };
        this.used_disks = rix_make_watch_data({used:[], cur_path:''});
        if(this.parent.parent&&this.parent.parent.schema.uniqueItems) {
            let cur_list = this.parent.parent;
            this.jsoneditor.watch(cur_list.path, ()=> {
                let v2 = cur_list.getValue();
                let list = v2.map(v=>v.path);
                this.used_disks.set('used', list);
            });
        }
        this.set_model = (v)=> {
            if (self.parent && self.parent.jsoneditor) {
                let pr = self.parent.jsoneditor.getEditor(self.parent.path + '.model');
                if (pr && self.disks) {
                    let v2 = v;
                    let model = self.disks.filter(v => v.path == v2)[0];
                    if (model) {
                        pr.setValue(model.model);
                    }
                }
            }
        };
        this.used_disks.watch('cur_path', this.set_model);
        let MyRender = ()=> {
            let value = this.used_disks.get('cur_path', '');
            return (<RixSelect onChange={onChange} value={value}>
                      {disks.map(disk => <option key={disk.path} value={disk.path}>{`${disk.model}(${disk.size}) at ${disk.path}`}</option>)}
                    </RixSelect>);
        };
        if(this.view_root && this.rix_init_flag) return;
        this.view_root.render(<MyRender/>);
        this.rix_init_flag = true;
    }
    setValue(v, init, fromTemplate) {
        if(this.value === v) return;
        this.value = v;
        this.refreshValue();
        let temp_disk = (this?.disks??[]).filter(v2=>v2[this.options?.get_prop??'path'] == v)[0];
        this.used_disks.set("cur_path", temp_disk?.path??v);
        this.onChange(true);
    }
    getValue() {
        return this.value;
    }
    destroy() {
        this.used_disks.unwatch(this.set_model);
        setTimeout(()=> {
        this.view_root?.unmount();
            this.rix_init_flag = false;
        });
    }
}


class Disk_Select extends JSONEditor.AbstractEditor{
    build() {
        let value = this.value;
        let self = this;
        this.title = this.header = this.label = this.theme.getFormInputLabel(this.getTitle(), this.isRequired());
        this.container.appendChild(this.title);
        let disks = this.options.disks;
        this.disks = disks;
        const div = document.createElement('div');
        this.container.append(div);
        this.view_root = ReactDOM.createRoot(div);
        this.rix_init_flag = false;
        let onChange = (e, v)=> {
            e.preventDefault();
            this.setValue(v, false, false);
        };
        this.used_disks = rix_make_watch_data({used:[], cur_path:''});
        if(this.parent.parent&&this.parent.parent.schema.uniqueItems) {
            let cur_list = this.parent.parent;
            this.jsoneditor.watch(cur_list.path, ()=> {
                let v2 = cur_list.getValue();
                let list = v2.map(v=>v.path);
                this.used_disks.set('used', list);
            });
        }
        this.set_model = (v)=> {
            if (self.parent && self.parent.jsoneditor) {
                let pr = self.parent.jsoneditor.getEditor(self.parent.path + '.model');
                if (pr && self.disks) {
                    let v2 = v;
                    let model = self.disks.filter(v => v.path == v2)[0];
                    if (model) {
                        pr.setValue(model.model);
                    }
                }
            }
        };
        this.used_disks.watch('cur_path', this.set_model);
        //const {global_data} = this.defaults;//useData();
        //console.log("this.defaults===", this.defaults);
        let MyRender = ()=> {
            //console.log("global_===", useData());
            const {global_data} = useContext(DataContext);
            const [options, setOptions] = useState([]);
            const [value, setValue] = useState('');
            if(!disks) {
                let list = global_data.get('blockdevices');
                let canuse = [];
                for (let disk of list) {
                    if(!disk.children) {
                        //无分区
                        if(disk.mountpoint) {
                            //已挂载
                            continue;
                        }
                        canuse.push(disk);
                    }
                    if(disk.children&&disk.children.length >= 1) {
                        let nouse = disk.children.filter(v=>{
                            if(v.children&&v.children.length >=1 ) { //加密且已打开
                                for(let one of v.children) {
                                    if(one.type == 'crypt' && one.mountpoint == null) {
                                        return true;
                                    }
                                }
                            } else {
                                if(v.mountpoint == null)
                                    return true;
                            }
                            return false;
                        });
                        if(nouse.length == 0) continue;
                        canuse.push(disk);
                    }
                }
                disks = canuse;
            }
            this.disks = disks;
            useEffect(() => {
                let set_options = (v2)=> {
                    let list_options = disks.map(v=>v.path);
                    list_options = list_options.filter(v=> {
                        return v2.filter(name=>name==v).length == 0;
                    });
                    let options = list_options.map(disk=>{
                        return {
                            title:`${disk.model}(${disk.size}) at ${disk.path}`,
                            value: `${disk.path}`
                        };
                    });
                    setOptions(options);
                };
                this.used_disks.watch('used', set_options);
                let set_v = (v2)=> {
                    setValue(v2);
                    this.set_model(v2);
                };
                set_options(this.used_disks.get('used'));
                set_v(this.used_disks.get('cur_path'));
                //this.used_disks.watch('cur_path', set_v);
                return ()=> {
                    this.used_disks.unwatch('used', set_options);
                    //this.used_disks.unwatch('cur_path', set_v);
                };
            },[]);
            let Options = ()=> {
                let ret = [];
                let RenderChilder = (v)=> {
                    let type = v.fstype;
                    if(!v.fstype) {
                        type = v.type;
                    }
                    return <option value={v.path} key={v.path}>{v.path}[{type}](分区)</option>;
                };
                for(let disk of disks) {
                    if(disk.children&&disk.children.length > 0) {
                        let children = [];
                        let uuid = disk.uuid || disk.path;
                        let c_check = true;
                        if(disk.children&&disk.children.length>=1) {
                            let use = disk.children.filter(v=>v.mountpoint != null);
                            if(use.length >0 ) {
                                c_check = false;
                            }
                        }
                        if(c_check) {
                            children.push(<option value={disk.path} key={disk.path}>{disk.path}(整个磁盘)</option>);
                        }
                        disk.children.forEach(v=> {
                            if(v.mountpoint == null && !v.children) {
                                children.push(RenderChilder(v));
                            }
                            if(v.children&&v.children.length > 0) {
                                v.children.forEach(v2=> {
                                    if(v2.mountpoint == null) {
                                        children.push(RenderChilder(v2));
                                    }
                                });
                            }
                        });
                        let title = `${disk.model}(${disk.size}) at ${disk.path}`;
                        ret.push(<optgroup key={disk.uuid} label={title}>
                                 {children}
                                 </optgroup>);
                    } else {
                        let title = `${disk.model}(${disk.size}) at ${disk.path}`;
                        let uuid = disk.uuid || disk.path;
                        ret.push(<optgroup label={title} key={uuid}>
                                 <option value={disk.path}>{disk.path}(整个磁盘)</option>
                                 </optgroup>);
                    }
                }
                return ret;
            };
            return (<RixSelect onChange={onChange} value={value}>
                    <Options />
                    </RixSelect>);
        };
        this.view_root.render(<DataProvider><MyRender/></DataProvider>);
    }
    setValue(v, init, fromTemplate) {
        this.value = v;
        this.refreshValue();
        this.used_disks.set("cur_path", v);
        this.onChange(true);
    }
    getValue() {
        return this.value;
    }
    destroy() {
        this.used_disks.unwatch(this.set_model);
        setTimeout(()=> {
        this.view_root.unmount();
        });
    }
}

class Pool_Select extends JSONEditor.AbstractEditor{
    build() {
        let value = this.value;
        let self = this;
        this.title = this.header = this.label = this.theme.getFormInputLabel(this.getTitle(), this.isRequired());
        this.container.appendChild(this.title);
        let pools = this.options.pools;
        this.pools = pools;
        const div = document.createElement('div');
        this.container.append(div);
        this.view_root = ReactDOM.createRoot(div);
        this.rix_init_flag = false;
        let onChange = (e, v)=> {
            e.preventDefault();
            this.setValue(v, false, false);
        };
        this.used_disks = rix_make_watch_data({used:[], cur_name:''});
        if(this.parent.parent&&this.parent.parent.schema.uniqueItems) {
            let cur_list = this.parent.parent;
            this.jsoneditor.watch(cur_list.path, ()=> {
                let v2 = cur_list.getValue();
                let list = v2.map(v=>v.path);
                this.used_disks.set('used', list);
            });
        }
        this.set_model = (v)=> {
            if (self.parent && self.parent.jsoneditor) {
                let pr = self.parent.jsoneditor.getEditor(self.parent.path + '.model');
                if (pr && self.disks) {
                    let v2 = v;
                    let model = self.disks.filter(v => v.path == v2)[0];
                    if (model) {
                        pr.setValue(model.model);
                    }
                }
            }
        };
        this.used_disks.watch('cur_name', this.set_model);
        //const {global_data} = this.defaults;//useData();
        let MyRender = ()=> {
            const [options, setOptions] = useState([]);
            const [value, setValue] = useState('');
            //if(!disks) disks = global_data.get('blockdevices');
            //this.disks = disks;
            useEffect(() => {
                let set_options = (v2)=> {
                    let list_options = pools.map(v=>v.name);
                    list_options = list_options.filter(v=> {
                        return v2.filter(name=>name==v).length == 0;
                    });
                    setOptions(list_options);
                };
                //this.used_disks.watch('used', set_options);
                let set_v = (v2)=> {
                    setValue(v2);
                    //this.set_model(v2);
                };
                set_options(this.used_disks.get('used'));
                set_v(this.used_disks.get('cur_name'));
                //this.used_disks.watch('cur_path', set_v);
                return ()=> {
                    this.used_disks.unwatch('used', set_options);
                    //this.used_disks.unwatch('cur_path', set_v);
                };
            },[]);
            return <Autocomplete
                     freeSolo
                     value={value}
                     onChange={onChange}
                     options={options}
                     getOptionLabel={(option) => {
                         let disk = pools.filter(v=>v.name== option)[0];
                         if(disk) {
                             let v = `${disk.name} at ${disk.mount_path}`;
                             return v;
                         }
                         return "";
                     }}
                     renderInput={(params) => {
                                               return <TextField {...params} label="选择存储池" />;
                                              }}
                   />;
        };
        this.view_root.render(<MyRender/>);
    }
    setValue(v, init, fromTemplate) {
        this.value = v;
        this.refreshValue();
        this.used_disks.set("cur_name", v);
        this.onChange(true);
    }
    getValue() {
        return this.value;
    }
    destroy() {
        this.used_disks.unwatch(this.set_model);
        setTimeout(()=> {
        this.view_root.unmount();
        });
    }
}
const JsonEditorForm = forwardRef((props, ref) => {
    const { schema, callbacks} = props;
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const {global_data} = useContext(DataContext);
    let [update, setUpdate] = useState(0);
    JSONEditor.defaults.editors.disk_select= Disk_Select;
    JSONEditor.defaults.editors.disk_select_without_part = Disk_Select_Without_Part;
    JSONEditor.defaults.global_data = global_data;
    JSONEditor.defaults.editors.pool_select = Pool_Select;
    JSONEditor.defaults.options.keep_oneof_values = false;
    JSONEditor.defaults.resolvers.unshift(function (schema) {
        if (schema.type === 'string' && schema.format === 'disk_select') {
            return 'disk_select';
        }
        if (schema.type === 'string' && schema.format === 'pool_select') {
            return 'pool_select';
        }
        if (schema.format === 'disk_select_without_part') {
            return 'disk_select_without_part';
        }
    });
    useEffect(() => {
        //if(editorRef.current) return;
        let options = {
            schema,
            theme: 'bootstrap4',
            //iconlib: 'fontawesome4',
            ...props.options,
            ajax: true,
            expand_height: true,
            //disable_collapse: true,
            //disable_edit_json: true,
            //disable_properties: true,
            //no_additional_properties: true,
            //required_by_default: true,
        };
        editorRef.current = new JSONEditor(containerRef.current, options);
        editorRef.current.on('ready',() => {
            // Now the api methods will be available
            if(props.data) {
                //setTimeout(()=> {
                console.log("json props====", JSON.stringify(props.data), props.data);
                editorRef.current.setValue(props.data);
                    console.log("getvalue==", editorRef.current.getValue());
                //setUpdate(update+1);
                //});
            }
        });
        return () => {
            if (editorRef.current) {
                console.log("jsoneditor destroy");
                editorRef.current.destroy();
            }
        };
    }, [schema,props]);

    const getValue = () => {
        return editorRef.current.getValue();
    };
    const setValue=(data)=> {
        return editorRef.current.setValue(data);
    };

    useImperativeHandle(ref, () => ({
        getValue,
        setValue,
    }));

    return (<div ref={containerRef} {...props} key={update}></div>);
});
export default JsonEditorForm;
