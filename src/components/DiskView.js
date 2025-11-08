import React, { useImperativeHandle, useState, useEffect, useRef, forwardRef, useContext } from 'react';
import { 
  Settings, RefreshCw, Info, HardDrive, AlertTriangle, 
  CheckCircle, HardDriveOff, Activity, Save
} from 'lucide-react';
import RixWindow from "../rix/RixWindow";
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import {context_value} from "../store/global_data";
import {WindowApi, useWindowManager} from "../rix/RixWindowManager";
import "./DiskView.css";
import Disks from "../utils/disks";
import JsonEditorForm from './JsonEditorForm';
import Config_Schema from "./config_schema.js";
const {global_data, api, make_watch_data} = context_value;


const initialDisks = [
  { name: "4T", usage: 0.75, brand: "Seagate", read: 180, write: 150 },
  { name: "2T", usage: 0.85, brand: "Western Digital", read: 160, write: 120 },
  { name: "3T", usage: 0.70, brand: "Toshiba", read: 170, write: 130 },
  { name: "1T", usage: 0.90, brand: "Samsung", read: 220, write: 200 },
  { name: "8T", usage: 0.60, brand: "HGST", read: 210, write: 190 },
];

const row_select = [4,6,8,10,12,14,16,18,24];

const Setting = forwardRef(({data}, ref)=> {
    let Select_Row = ()=> {
        let [update, setUpdate] = useState(0);
        useEffect(()=> {
            let w = data.watch('perRow', (v)=> {
                setUpdate(update+1);
            });
            return ()=> {
                data.unwatch('perRow');
            };
        }, [data.perRow]);
        
        return <select
                  className="form-control d-inline-block w-auto me-3"
                  value={data.perRow}
                  onChange={(e) => data.set('perRow',(Number(e.target.value)))}
           >
             {row_select.map((n) => (
                 <option key={n} value={n}>
                   {n}
                 </option>
             ))}
           </select>;
    };
    let Select_Ori = ()=> {
        let [update, setUpdate] = useState(0);
            useEffect(()=>{
                let w = data.watch('orientation', (v)=> {
                    setUpdate(update+1);
                });
                return ()=> {
                    data.unwatch('orientation', w);
                };
            }, [data.orientation]);
            let onChange=(e) => {
                e.preventDefault();
                data.set('orientation',e.target.value);
            };
            return <select
                                 className="form-control d-inline-block w-auto"
                                 value={data.orientation}
                                 onChange={onChange}
                          >
                            <option value="vertical">垂直</option>
                            <option value="horizontal">水平</option>
                          </select>;
        };
    let jsonEditorFormRef = useRef(null);
    let schema = {
        ...Config_Schema,
        "$ref": `#/definitions/diskarray_setting`
    };
    let config = {
        //perRow: data.perRow,
        //orientation: data.orientation,
        //disks:[]
        ...data
    };

    const getValue = () => {
        return jsonEditorFormRef.current.getValue();
    };
    useImperativeHandle(ref, () => ({
        getValue,
        //setValue,
    }));

    /*
      <div className="bg-dark p-3 mb-4 rounded d-inline-block text-start">
      <label className="text-white me-2">每行磁盘数:</label>
      <Select_Row/>
      <label className="text-white me-2">磁盘方向:</label>
      <Select_Ori/>
      </div>
      */
    return <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={config}/>;
});

const Disk = ({ disk, orientation }) => {
  //const [readActive, setReadActive] = useState(false);
  //const [writeActive, setWriteActive] = useState(false);
    let data = make_watch_data({
        readActive:false,
        writeActive:false,
    });
    let usage_data = Disks.get_disk_usage(disk.path);
    let usage = usage_data.used/usage_data.size;
    //console.log("disk=", disk, "usage_data=", usage_data);

    useEffect(() => {
        let w = global_data.watch('sysstat', (v)=> {
            let f = v.filter(sys_disk=> {
                if(disk.path == '/dev/'+sys_disk.Device) return true;
                return false;
            })[0];
            if(f) {
                let read = parseFloat(f['kB_read/s']);
                let write = parseFloat(f['kB_wrtn/s']);
                //console.log("disk_path=", disk.path, "read=", read, "write=", write, f);
                if(read>0) {
                    data.set('readActive', true);
                } else {
                    data.set('readActive', false);
                }
                if(write > 0) {
                    data.set('writeActive', true);
                } else {
                    data.set('writeActive', false);
                }
            }
        });
        return () => {
            global_data.unwatch('sysstat', w);
        };
    },[orientation]);

    let RWState = ()=> {
        let [update, setUpdate] = useState(0);
        let old_readActive = data.readActive;
        let old_writeActive = data.writeActive;
        useEffect(()=> {
            let r = data.watch('readActive', (v)=> {
                if(v != old_readActive) {
                    old_readActive = v;
                    setUpdate(update+1);
                }
            });
            let w = data.watch('writeActive', (v)=> {
                if(v != old_writeActive) {
                    old_writeActive = v;
                    setUpdate(update+1);
                }
            });
            return ()=> {
                data.unwatch('readActive', r);
                data.unwatch('writeActive', w);
            };
        });
        return (<div className={`disk-leds-${orientation} m-1 gap-1 `}>
                  <div className={`led led-read ${data.readActive ? "active" : ""}`}></div>
                  <div className={`led led-write ${data.writeActive ? "active" : ""}`}></div>
                </div>);
    };

    let f = (global_data?.disks_health??[]).filter(v=> v.device==disk.path)[0];
    let disk_state = '';
    if(f) {
        switch(f.type) {
        case 'ssd': {
            if(parseInt(f.life) > 90) {
                disk_state = '-fire';
            }
        }
            break;
        case 'hdd': {
            f.attributes.forEach(v=> {
                if(v.value > 0) {
                    disk_state='-fire';
                }
            });
        }
            break;
        }
    }

  return (
    <div
      className={`disk bg-dark border bd-black rounded d-flex justify-center align-center shadow-3 pos-relative ${
        orientation === "vertical" ? "disk-vertical" : "disk-horizontal"
      }`}
      data-role="hint"
      data-hint={`品牌: ${disk.serial}\n容量: ${disk.size}\n读: ${disk.read}MB/s\n写: ${disk.write}MB/s\n使用率: ${Math.round(
        disk.usage * 100
      )}%`}
      data-hint-position="top"
    >
      {/* 已用空间 */}
      <div className={`disk-body-${orientation}`}>
      <div
        className={`disk-usage${disk_state} bg-gray`}
        style={
          orientation === "vertical"
                ? { height: `${usage * 100}%`, width: `100%` }
            : { width: `${usage * 100}%`, height:`100%` }
        }
      >
      </div>

      {/* 标签 */}
      <div className="disk-label text-white text-bold text-center">
        <div>{disk.user_label||disk.model}</div>
        <div>{disk.size}</div>
        <div>{disk.path}</div>
      </div>
      </div>
      {/* 读写灯 */}
      <RWState/>
    </div>
  );
};

const DiskArray = forwardRef((props, ref)=> {
    let mywindow = React.createRef();
    const [orientation, setOrientation] = useState("vertical");
    let devices = global_data.get('blockdevices', []).filter(v=>!v.ro&&v['id-link']);
    let pools = global_data.get('pools');
    console.log("poools=", pools);

    let data = make_watch_data({
        disks:devices,
        perRow:4,
        orientation: "vertical",
        org_config:{
            perRow:4,
            orientation: "vertical",
            disks:[],
        }
    });

    console.log("global.disks=", devices);

    let RenderArr = ()=> {
        let [update, setUpdate] = useState(0);
        
        // 计算行数
        const rows = [];
        for (let i = 0; i < data.disks.length; i += data.perRow) {
            rows.push(data.disks.slice(i, i + data.perRow));
        }
        useEffect(()=> {
            let row_w = data.watch('perRow', (v)=> {
                setUpdate(update+1);
            });
            let orientation_w = data.watch('orientation', (v)=> {
                setUpdate(update+1);
            });
            return ()=> {
                data.unwatch('row', row_w);
                data.unwatch('orientation', orientation_w);
            };
        },[data.orientation, data.perRow]);
        return (<div className="d-flex flex-column align-center gap-3">
                {rows.map((row, i) => (
                    <div key={i} className="d-flex justify-center gap-3">
                      {row.map((disk, j) => (
                          <Disk key={j} disk={disk} orientation={data.orientation} />
                      ))}
                    </div>
                ))}
                </div>);
    };

    let update_data = (config)=> {
        data.set("perRow", config?.perRow??6);
        data.set("orientation", config?.orientation??"vertical");
        if((config?.disks??[]).length > 0) {
            let disks = [...global_data.get('blockdevices', []).filter(v=>!v.ro&&v['id-link'])];
            let used = [];
            for(let v of config.disks) {
                let index = disks.findIndex(v2=>`${v2['id-link']}` == `${v['id-link']}`);

                if(index >= 0) {
                    let one = disks[index];
                    one.user_label = v.label;
                    used.push({...one});
                    disks.splice(index, 1);
                }
            }
            disks.forEach(v=> {
                used.push(v);
            });
            data.set("disks", used);
        }
        data.set('org_config', config);
    };

    useEffect(()=> {
        api.config_file({
            filename:'/app/config/diskarray_setting.json',
            'op':'get'
        }).then(res=> {
            try {
                let config = {};
                console.log("res==", res);
                if(typeof res == 'string') {
                    config = JSON.parse(res);
                } else {
                    config = res;
                }
                console.log("config==", config);
                update_data(config);
            } catch (e) {
            }
        });
    });

    
    let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= WindowApi;

    let settings = useRef(null);
    let close = ()=> {
    };
    
    let OpenSetting = ()=> {
        let id = 'dialog_'+Date.now();
        let save = ()=> {
            let v = settings.current.getValue();
            console.log("ready save==", v);
            api.config_file({
                filename:'/app/config/diskarray_setting.json',
                'op': 'put',
                data: JSON.stringify(v)
            }).then(res=> {
                if(res.ret == 0) {
                    /*
                    data.set("perRow", v.perRow);
                    data.set("orientation", v.orientation);
                    if(v.disks.length > 0) {
                        data.set("disks", v.disks);
                    }*/
                    update_data(v);
                    closeDialog(id);
                }
            });
        };
        openDialog({
            id,
            content: <RixDialog width="fit-content">
                       <div type="content">
                         <Setting data={data.org_config} ref={settings}/>
                       </div>
                       <button type="action" className="button primary" onClick={save}>保存</button>
                       <button type="action" className="button js-dialog-close" onClick={close}>取消</button>
                     </RixDialog>
        });
    };

    return (
        <RixWindow {...props} ref={ref}>
          <div className="bg-black text-center p-4 min-vh-100" ref={mywindow}>
            <h4 className="text-white mb-3">磁盘阵列监控面板</h4>

            {/* 设置面板 */}
            <RixButton className="button mif-cog success" onClick={OpenSetting}>设置</RixButton>
            {/*
            <div className="bg-dark p-3 mb-4 rounded d-inline-block text-start">
              <label className="text-white me-2">每行磁盘数:</label>
              <Select_Row/>
              <label className="text-white me-2">磁盘方向:</label>
              <Select_Ori/>
              </div>*/}
            {/* 阵列显示 */}
            <RenderArr/>
          </div>
        </RixWindow>
    );
});


const DiskArray2 = forwardRef((props, ref)=> {
    const disks = initialDisks;
    const [layout, setLayout] = useState("vertical"); // horizontal / vertical
  const [perRow, setPerRow] = useState(5);

  return (
      <RixWindow {...props} ref={ref}>
    <div className="container-fluid bg-dark p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="text-white">磁盘阵列状态</h4>
        <div className="d-flex gap-2 align-items-center">
          <label className="text-white">布局方向：</label>
          <select
            className="custom-select"
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
          >
            <option value="horizontal">横向</option>
            <option value="vertical">纵向</option>
          </select>

          <label className="text-white ms-3">每行磁盘数：</label>
          <input
            type="number"
            className="form-control"
            style={{ width: "70px" }}
            min="1"
            value={perRow}
            onChange={(e) => setPerRow(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div
        className={`disk-array ${
          layout === "horizontal" ? "disk-array-horizontal" : "disk-array-vertical"
        }`}
        style={{
          gridTemplateColumns:
            layout === "horizontal" ? `repeat(${perRow}, 1fr)` : "none",
          gridTemplateRows:
            layout === "vertical" ? `repeat(${perRow}, auto)` : "none",
        }}
      >
        {disks.map((disk, i) => (
          <div
            key={i}
            className={`disk-item ${layout}`}
            data-role="hint"
            data-hint-position="top"
            data-hint={`型号: ${disk.brand}\n容量: ${disk.capacity}\n读速: ${disk.readSpeed}MB/s\n写速: ${disk.writeSpeed}MB/s`}
          >
            <div className="disk-main">
              <div className="disk-usage">
                <div
                  className="disk-used"
                  style={{ width: `${disk.usedPercent}%` }}
                ></div>
                <div className="disk-label text-white">
                  {disk.name} ({disk.usedPercent}%)
                </div>
              </div>
            </div>

            <div
              className={`disk-lights ${
                layout === "vertical" ? "lights-vertical" : "lights-horizontal"
              }`}
            >
              <div
                className={`light read ${
                  disk.reading ? "active" : ""
                }`}
              ></div>
              <div
                className={`light write ${
                  disk.writing ? "active" : ""
                }`}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
      </RixWindow>
  );
});


export default DiskArray;
