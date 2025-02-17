import React,{Component, Fragment, useState, forwardRef, useEffect, useImperativeHandle, useRef} from 'react';
import ReactDOM from 'react-dom';
import { hydrateRoot,createRoot } from 'react-dom/client';
import {rix_make_watch_data, useData, DataContext, DataProvider} from "../store/global_data.js";
import {useWindowManager} from "../rix/RixWindowManager";
const {Metro, $} = window;

const RixDialog = (props) => {
    //let ref = React.createRef();
    let {id,children, closebutton, ...p} = props;
    console.log("RixDialog props==", props, p);
    let api = rix_make_watch_data({
        status: false,
    });
    let {closeDialog}= useWindowManager();
    let content = children.filter(v=> {
        return v.props.type == 'content';
    });
    let context = useData();
    useEffect(()=> {
        let w = Metro.dialog.create(
            {
                closeButton: closebutton,
                ...p,
                onClose:()=> {
                    closeDialog(id);
                    if(p.onClose) {
                        p.onClose();
                    }
                }
            }
        );
        let win = w.data("dialog");

        win.setContent('');
        let actions= children.filter(v=>{
            return v.props.type === 'action';
        });
        if(actions.length > 0) {
            let root = createRoot(w.find(".dialog-actions")[0]);
            root.render(actions);
            //ReactDOM.render(actions,w.find(".dialog-actions")[0]);
        }
        let Content = children.filter(v=>{
            return v.props.type === 'content';
        });
        if(Content.length > 0) {
            console.log("content=", Content);
            let root = createRoot(w.find(".dialog-content")[0]);
            root.render(<DataProvider>{Content}</DataProvider>);
        }
        let title = children.filter(v=>{
            return v.props.type === 'title';
        });
        if(title.length > 0) {
            win.setTitle("");
            let root = createRoot(w.find(".dialog-title")[0]);
            root.render(title);
        }
        win.open();
        win.element.css({//position:'relative',
            'top':'10%',
            'overflow': 'auto'
        });
        let status = api.watch('status', (v)=> {
            if(v == 'close') {
                //
                win.close();
            }
        });
        return ()=> {
            api.unwatch('status', status);
            win.close();
        };
    });
    let ret = <div></div>;
    return ret;
};
export default RixDialog;
