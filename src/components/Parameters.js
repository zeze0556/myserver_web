import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import JsonEditorForm from './JsonEditorForm';
import { styled } from '@mui/system';
import { Table, Pagination, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, TableContainer,
         TableHead,
         TableRow,
         TableCell,
         TableBody,
         Paper,
         TablePagination,
       } from '@mui/material';


const Parameters = () => {
    const [parameters, setParameters] = useState([]);
    const [data, setData] = useState({id:0,key:'',status:0,type:0,value:'', parent_id:0});
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filter, setFilter] = useState('');
    const [schema, setSchema] = useState({
        type: "object",
        properties: {
            id: { type: "integer", title: "ID", readonly: true },
            key: { type: "string", title: "Key" },
            status: {
                type: "integer",
                title: "Status",
                enum: [0, 1],
                options: {
                    enum_titles: ["Not available", "Available"],
                }
            },
            type: {
                type: "integer",
                title: "Type",
                enum: [0, 1, 2, 3, 4],
                options: {
                    enum_titles: ["json", "string", "number", "bool", "null"],
                }
            },
            parent_id: {
                type: "integer",
                title: "parent_id",
            },
            value: { type: "string", title: "Value", format: "json",
                     "options": {
                         "ace": {
                             "theme": "ace/theme/vibrant_ink",
                             "tabSize": 2,
                             "useSoftTabs": true,
                         }
                     }
                   },
        },
        required: ["key", "type", "value", "parent_id", "id", "status"],
    });
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [newParameter, setNewParameter] = useState({ key: '', value: '', type: '', status: '' });


    useEffect(() => {
        fetchParameters();
    }, []);

    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this parameter?')) {
            try {
                const response = await api.deleteParameter({ op: 'delete', data: { id }});

                if (response.ok) {
                    fetchParameters(); // 更新表格数据
                } else {
                    console.error('Error deleting parameter:', response.statusText);
                }
            } catch (error) {
                console.error('Error deleting parameter:', error);
            }
        }
    };

    const jsonEditorFormRef = useRef(null);
    const handleEditClick = (parameter) => {
        setData(parameter);
        console.log("data====", data);
        setOpenAddDialog(true);
    };
    const fetchParameters = async () => {
        const data = await api.getParameters(filter);
        setParameters(data);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    const filteredData = parameters.filter((row) => {
        return Object.values(row).some((value) => {
            return value.toString().toLowerCase().includes(filter.toLowerCase());
        });
    });

    let obj = {};
    const handleAddButtonClick = () => {
        let aschema = schema;
        let this_enum = [0];
        let this_enum_options = {
            enum_titles:['']
        };
        for(let i in parameters) {
            let one  = parameters[i];
            if(one.status == 1&&one.type==0) {
                this_enum.push(one.id);
                this_enum_options.enum_titles.push(one.key);
            }
        }
        console.log("obj==", obj, this_enum);
        if(this_enum.length > 0) {
            aschema.properties.parent_id.enum = this_enum;
            aschema.properties.parent_id.options = this_enum_options;
        }
        setSchema(aschema);
        setOpenAddDialog(true);
    };

    const handleCloseAddDialog = () => {
        setOpenAddDialog(false);
    };


    const handleSaveAddDialog = async () => {
        try {
            const newParameterData = jsonEditorFormRef.current.getValue();
            const response = await api.addParameter({ ...newParameterData});

            if (response.ok) {
                fetchParameters(); // 更新表格数据
                setOpenAddDialog(false); // 关闭对话框
            } else {
                console.error('Error saving parameter:', response.statusText);
            }
        } catch (error) {
            console.error('Error saving parameter:', error);
        }
    };

    const CustomDialogContent = styled(DialogContent)({
        width: '80%',
    });
    const renderAddDialog = () => {
        return (
            <Dialog open={openAddDialog} onClose={handleCloseAddDialog} fullWidth maxWidth="md">
              <DialogTitle>添加参数</DialogTitle>
              <CustomDialogContent>
                <JsonEditorForm schema={schema} ref={jsonEditorFormRef} data={data}/>
              </CustomDialogContent>
              <DialogActions>
                <Button onClick={handleSaveAddDialog}>保存</Button>
                <Button onClick={handleCloseAddDialog}>取消</Button>
              </DialogActions>
            </Dialog>
        );
    };
    for(let i in parameters) {
        let one = parameters[i];
        if(one.status == 0) continue;
        switch(one.type) {
        case 4:
            obj[one.key] = null;
            break;
        case 0:
            try {
                obj[one.key] = JSON.parse(one.value);
            } catch (e) {
                obj[one.key] = one.value;
            }
            break;
        default:
            obj[one.key] = one.value;
            break;
        }
    }
    let rend_value = (v)=> {
        let value = v.value;
        if(value.indexOf('${')>=0&&v.type == 1) {
            try {
                // 获取对象的所有键，并将其转换为参数列表
                const keys = Object.keys(obj).join(',');
                // 创建一个新的函数，该函数接受对象的键作为参数并返回字符串
                const func = new Function(keys, `"use strict"; return \`${value}\`;`);
                // 使用对象的值调用该函数
                const values = Object.values(obj);
                const result = func(...values);
                return result;
            } catch (e) {
                //let error = `error: ${JSON.stringify(v)}`;
                //alert(error);
                return value;
            }
        }
        return value;
    };
    return (
        <div>
          <TextField
            label="Filter"
            variant="outlined"
            value={filter}
            onChange={handleFilterChange}
            style={{ marginBottom: '1rem' }}
          />
          <Button onClick={handleAddButtonClick}>添加</Button>
          {renderAddDialog()}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>设备</TableCell>
                  <TableCell>标识</TableCell>
                  <TableCell>温度</TableCell>
                  <TableCell>读取</TableCell>
                  <TableCell>写入</TableCell>
                  <TableCell>错误</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData
                 .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                 .map((row) => (
                     <TableRow key={row.id}>
                       <TableCell>
                         <Button onClick={() => handleEditClick(row)}>编辑</Button>
                         <Button onClick={() => handleDeleteClick(row.id)}>删除</Button>
                       </TableCell>
                       <TableCell>{row.id}</TableCell>
                       <TableCell>{row.key}</TableCell>
                       <TableCell>{rend_value(row)}</TableCell>
                       <TableCell>{row.type}</TableCell>
                       <TableCell>{row.status}</TableCell>
                     </TableRow>
                 ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredData.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            style={{ marginTop: '1rem' }}
          />
        </div>
    );
};

export default Parameters;
