import React, {useState, useEffect, useRef, useContext, forwardRef, useImperativeHandle, Fragment } from 'react';
import ReactDOM from 'react-dom/client';
import {DataContext, rix_make_watch_data} from "../store/global_data.js";
import {Autocomplete, TextField} from '@mui/material';

let JSONEditor = window.JSONEditor;


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
            let pr = this.parent.jsoneditor.getEditor(this.parent.path+'.model');
            if(pr&&this.disks) {
                let v2 = v;
                let model = this.disks.filter(v=>v.path == v2)[0];
                if(model) {
                    pr.setValue(model.model);
                }
            }
        };
        this.used_disks.watch('cur_path', this.set_model);
        let MyRender = ()=> {
            const [options, setOptions] = useState([]);
            const [value, setValue] = useState('');
            const global_data = useContext(DataContext);
            if(!disks) disks = global_data.get('blockdevices');
            this.disks = disks;
            useEffect(() => {
                let set_options = (v2)=> {
                    let list_options = disks.map(v=>v.path);
                    list_options = list_options.filter(v=> {
                        return v2.filter(name=>name==v).length == 0;
                    });
                    setOptions(list_options);
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
            return <Autocomplete
                     freeSolo
                     value={value}
                     onChange={onChange}
                     options={options}
                     getOptionLabel={(option) => {
                         let disk = disks.filter(v=>v.path == option)[0];
                         if(disk) {
                             let v = `${disk.model}(${disk.size}) at ${disk.path}`;
                             return v;
                         }
                         return "";
                     }}
                     renderInput={(params) => {
                                               return <TextField {...params} label="选择磁盘" />;
                                              }}
                   />;
        };
        this.view_root.render(<MyRender/>);
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
        this.view_root.unmount();
        this.used_disk.unwatch(this.set_model);
    }
}
const JsonEditorForm = forwardRef((props, ref) => {
    const { schema, callbacks } = props;
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const global_data = useContext(DataContext);
    JSONEditor.defaults.editors.disk_select= Disk_Select;
    JSONEditor.defaults.resolvers.unshift(function (schema) {
        if (schema.type === 'string' && schema.format === 'disk_select') {
            return 'disk_select';
        }
    });
    if(editorRef.current&&props.data) {
        editorRef.current.setValue(props.data);
    }
    useEffect(() => {
        //if(editorRef.current) return;
        let options = {
            schema,
            theme: 'bootstrap3',
            iconlib: 'fontawesome4',
            //disable_collapse: true,
            //disable_edit_json: true,
            //disable_properties: true,
            //no_additional_properties: true,
            //required_by_default: true,
        };
        editorRef.current = new JSONEditor(containerRef.current, options);
        return () => {
            if (editorRef.current) {
                editorRef.current.destroy();
            }
        };
    }, [schema]);

    const getValue = () => {
        return editorRef.current.getValue();
    };

    useImperativeHandle(ref, () => ({
        getValue,
    }));

    return (
        <div ref={containerRef} {...props}/>
    );
});
export default JsonEditorForm;
