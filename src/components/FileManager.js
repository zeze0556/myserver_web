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


function parse_ls_output(text='') {
    const lines = text.split('\n');
    const result = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        console.log("test tab=", line.split(`\t`));
        if (line.trim() !== '') {
            const match = line.match(/^(d|l|r)(x|w|x|s|t)(r-x|rw-)?([0-9]+) (.+?) -> (.+?)$/);
            //const match = line.match(/^(d|l|r)(wxr-x|xr-w|wrx--x|xrw-)|[a-zA-Z0-9\s]+ (\d+) (.+?) -> (.+?)$/);
            if (match) {
                const type = match[1];
                const permissions = match[2];
                const size = parseInt(match[3]);
                const originalPath = match[5];
                const linkTarget = match[6];
                /*
                const type = match[1];
                const size = match[2];
                const owner = match[3].split(' ')[0];
                const group = match[3].split(' ')[1];
                const permissions = match[4];
                */
                let path;
                if (type === 'l') {
                    path = match[5] + '/' + match[7];
                } else {
                    path = match[5];
                }
                result.push({
                    type,
                    size: parseInt(size),
                    //owner,
                    //group,
                    permissions,
                    path,
                });
            }
        }
    }
    return result;
}

const FileManager = forwardRef((props, ref)=> {
    let mywindow = React.createRef();
    const { global_data, api } = useData();

    console.log("FileManager ===", props);

    /*let DirShow= (props)=> {
        let {state, update} = useState(0);
        let list = [];
        useEffect(()=> {
            api.run_command({
                command: "ls",
                args:["-lt", '/']
            }).then(res=> {
                if(res.data&&res.data.stdout) {
                    console.log("stdout==", res.data.stdout);
                    let list = parse_ls_output(res.data.stdout);
                    console.log("list==", list);
                }
            });
            return ()=> {
            };
        });
        return <></>;
    };*/
    let CurShow = ()=> {
        //let url = `/novnc/vnc.html?autoconnect=true&resize=remote&path=wsproxy/?token=${props.data.name}`;
        let url = `/filebrowser`;
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

export default FileManager;
