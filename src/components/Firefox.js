import React, {forwardRef,useState, useEffect, useRef, useContext } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon} from 'xterm-addon-attach';
import 'xterm/css/xterm.css';
import {useWindowManager} from "../rix/RixWindowManager";
import RixWindow from "../rix/RixWindow";
import RixButton from "../rix/RixButton";
import cmd from "../utils/command";
import Disks from "../utils/disks";
import {useData, rix_make_watch_data} from "../store/global_data.js";


const FireFox = forwardRef((props, ref)=> {
    let mywindow = React.createRef();
    const { global_data, api } = useData();
    let CurShow = ()=> {
        let url = `/firefox/`;
        return <iframe src={url} style={{
            "width": "100%",
            "height": "100%",
        }} frameborder="0" scrolling="auto"></iframe>;
    };
    return (<RixWindow {...props} ref={ref}>
            <div style={{'height':'100%',
                         'overflow': 'hidden'
                        }} ref={mywindow}>
            <CurShow/>
            </div>
            </RixWindow>);

});

export default FireFox;
