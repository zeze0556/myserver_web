// SettingsWindow.js
import React, { useState, useRef, forwardRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import { Paper} from '@mui/material';
import { useWindowManager } from './WindowManager';

const default_max = true;

const AppWindow = forwardRef((props, ref)=> {
    useWindowManager();
    const {  onActive, onMinimize } = props;
    const drag_ref = useRef(null);
    const [state, setState] = useState({
        width: props.width || 500,
        height: props.height || 500,
        left: props.left,
        top: props.top,
        isMaximized: default_max,
        default_positon: {x:0, y:0}
  });

    useEffect(()=> {
        if(default_max) {
            handleMaximize();
        }
    },[]);

    const handleMin = ()=> {
        let org_size = {
            width: state.width,
            height: state.height,
            left: state.left,
            top: state.top,
            old_drag_state: { ...drag_ref.current.state },
            default_postion: state.default_positon
        };
        setState({
            ...state,
            org_size,
        });
        onMinimize();
    };

  const handleMaximize = () => {
      let org_size = {
          width:state.width,
          height:state.height,
          left: state.left,
          top: state.top,
          old_drag_state: {...drag_ref.current.state},
          default_postion: state.default_positon
      };
      drag_ref.current.state.x = 0;
      drag_ref.current.state.y = 0;
      setState({...state, isMaximized: true, width: props.maxwidth, height:props.maxheight,
                left:0,
                top:0,
                default_positon: {x:0, y:0},
                org_size,
               });
  };

  const handleRestore = () => {
      drag_ref.current.state.x = state.org_size.old_drag_state.x;
      drag_ref.current.state.y = state.org_size.old_drag_state.y;
      setState({
          ...state, isMaximized: false,
          ...state.org_size
      });
  };
    const drag_start = (e)=> {
        onActive(e);
    };
    let onResize = (event, { node, size, handle }) => {
        onActive(event);
        setState({ ...state,
                   width: size.width, height: size.height,
                 });
    };
    return (<Draggable handle=".window-title"
        zIndex={props.zIndex}
        defaultPosition={state.default_positon}
        onDrag={drag_start}
        ref={drag_ref}
    >
        <Resizable
            width={state.width}
            height={state.height}
            onResize={onResize}
            resizeHandles={['e', 'se', 's']}
        >
            <Paper
                sx={{
                    position: 'absolute',
                    left: state.left,
                    top: state.top,
                    width: state.width,
                    height: state.height,
                    zIndex: props.zIndex,
                    display: props.hidden?'none':'block',
                    overflow:'auto'
                }}
            >
              {React.cloneElement(props.children, { ...props, onRestore:handleRestore, onMinimize: handleMin, onMaximize:handleMaximize, isMaximized:state.isMaximized})}
            </Paper>
            </Resizable>
            </Draggable>
);

});

export default AppWindow;
