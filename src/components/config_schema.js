const config_schema = {
    "definitions": {
        "system_other": {
            "zram": {
                "title": "使用zram做缓存",
                "type": "object",
                "properties": {
                    "auto_start": {
                        "type": "boolean",
                        "title": "启动时自动可用",
                        "default": true
                    },
                    "size": {
                        "type": "number",
                        "title": "使用大小(单位:G)",
                        "default": 2
                    },
                    "compress": {
                        "type": "string",
                        "title": "压缩方式",
                        "default": "lzo",
                        "enum": [
                            "lzo",
                            "lz4",
                            "lz4hc",
                            "deflate",
                            "842",
                            "zstd"
                        ],
                        "options": {
                            "enum_titles": [
                                "lzo",
                                "lz4",
                                "lz4hc",
                                "deflate",
                                "842",
                                "zstd"
                            ]
                        }
                    }
                },
                "required": [
                    "auto_start",
                    "size",
                    "compress"
                ]
            }
        },
        "sh_script": {
            "type": "string",
            "title": "bash",
            "format": "sh",
            "options": {
                "ace": {
                    "mode": "sh",
                    "theme": "ace/theme/vibrant_ink",
                    "tabSize": 2,
                    "useSoftTabs": true,
                }
            }
        },
        "notify_mail": {
            "type": "object",
            "title": "邮件通知",
            "properties": {
                "type": {
                    "type": "string",
                    "default": "mail",
                    "options": {
                        "hidden": true
                    }
                },
                "mail": {
                    "type": "boolean",
                    "default": true,
                    "options": {
                        "hidden": true
                    }
                },
                "host": {
                    "type": "string",
                    "title": "smtp服务器地址",
                    "default": ""
                },
                "port": {
                    "type": "string",
                    "title": "smtp服务器端口",
                    "default": 465
                },
                "user": {
                    "type": "string",
                    "title": "smtp用户名"
                },
                "pass": {
                    "type": "string",
                    "title": "smtp密码"
                },
                "to": {
                    "type": "string",
                    "title": "收件人地址"
                }
            },
            "required": [
                "type",
                "mail",
                "host",
                "port",
                "user",
                "pass",
                "to"
            ]
        },
        'system_settings': {
            "title": "系统参数",
            "type": "object",
            "properties": {
                "address": {
                    "type": "string",
                    "title": "监听地址",
                    "default": "0.0.0.0"
                },
                "port": {
                    "type": "integer",
                    "title": "监听端口",
                    "default": 8080
                },
                "notify": {
                    "type": "object",
                    "title": "系统通知",
                    "anyOf": [
                        {
                            "$ref": "#/definitions/notify_mail"
                        }
                    ]
                }
            },
            "required": [
                "address",
                "port",
                "notify"
            ]
        },
        'cron_edit_script': {
            "type": "object",
            "title": "任务配置",
            "properties": {
                "cron": {
                    "title": "定时配置",
                    "type": "string"
                },
                "script": {
                    "title": "bash脚本",
                    "type": "string",
                    "format": "sh",
                    "options": {
                        "ace": {
                            "mode": "sh",
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                        }
                    }
                }
            },
            "required": [
                "cron",
                "script"
            ]
        },
        'cron_add': {
            "type": "object",
            "title": "cron配置",
            "properties": {
                "script": {
                    "title": "脚本名称",
                    "type": "string",
                    "default": ""
                },
                "cron": {
                    "title": "定时设置",
                    "type": "string",
                    "default": ""
                }
            },
            "required": [
                "script",
                "cron"
            ]
        },
        'bootconfig': {
            'type': "string",
            "title": "ventoy参数配置",
            "format": "batchfile",
            "options": {
                "input_height": "500px",
                "ace": {
                    "mode": "batchfile",
                    "theme": "ace/theme/vibrant_ink",
                    "tabSize": 2,
                    "useSoftTabs": true,
                }
            }
        },
        'ventoy': {
            'type': "string",
            "title": "ventoy参数配置",
            "format": "json",
            "options": {
                "ace": {
                    "mode": "json",
                    "theme": "ace/theme/vibrant_ink",
                    "tabSize": 2,
                    "useSoftTabs": true,
                }
            }
        },
        'ventoy_persistence': {
        },
        'btrfs_balance': {
            "type": "object",
            "title": "转换/均衡",
            "properties": {
                "mount_path": {
                    "type": "string",
                    "default": "",
                    "title": "挂载路径"
                },
                "uuid": {
                    "type": "string",
                    "default": "",
                    "title": "uuid",
                    "options": {
                        "hidden": true
                    }
                },
                "data_convert": {
                    "type": "string",
                    "enum": [
                        "no",
                        "single",
                        "raid0",
                        "raid1",
                        "raid10",
                        "raid5",
                        "raid6"
                    ],
                    "options": {
                        "enum_titles": [
                            "仅均衡",
                            "single",
                            "raid0",
                            "raid1",
                            "raid5",
                            "raid6"
                        ]
                    }
                }
            },
            "required": [
                "mount_path",
                "uuid",
                "data_convert"
            ]
        },
        'pool_replace_device': {
            "type": "object",
            "title": "替换硬盘",
            "properties": {
                "mount_path": {
                    "type": "string",
                    "default": "",
                    "title": "挂载路径"
                },
                "uuid": {
                    "type": "string",
                    "default": "",
                    "title": "uuid",
                    "options": {
                        "hidden": true
                    }
                },
                "device": {
                    "type": "string",
                    //"format": "disk_select",
                    "title": "源设备",
                    "options": {
                        "enable": false
                    }
                },
                "target_device": {
                    "type": "string",
                    "format": "disk_select",
                    "title": "目标设备",
                }
            },
            "required": [
                "mount_path",
                "uuid",
                "device",
                "target_device"
            ]
        },
        'pool_add_device': {
            "type": "object",
            "title": "添加硬盘",
            "properties": {
                "mount_path": {
                    "type": "string",
                    "default": "",
                    "title": "挂载路径"
                },
                "uuid": {
                    "type": "string",
                    "default": "",
                    "title": "uuid",
                    "options": {
                        "hidden": true
                    }
                },
                "device": {
                    "type": "string",
                    "format": "disk_select",
                    "title": "设备",
                }
            },
            "required": [
                "mount_path",
                "uuid",
                "device"
            ]
        },
        'modify_pool': {
            "type": "object",
            "title": "配置",
            "properties": {
                "name": {
                    "type": "string",
                    "default": "",
                    "title": "名称"
                },
                "auto_mount": {
                    "type": "boolean",
                    "default": true,
                    "title": "自动挂载"
                },
                "mount_path": {
                    "type": "string",
                    "title": "挂载路径"
                },
                "mount_option": {
                    "type": "string",
                    "title": "挂载参数"
                },
                "type": {
                    "type": "string",
                    "title": "分区格式",
                    "options": {
                        "hidden": true
                    }
                },
                "uuid": {
                    "type": "string",
                    "title": "uuid",
                    "options": {
                        "hidden": true
                    }
                }
            },
            "required": [
                "uuid",
                "type",
                "name",
                "mount_path",
                "mount_option",
            ]
        },
        'add_to_pool': {
            "type": "object",
            "title": "配置",
            "properties": {
                "name": {
                    "type": "string",
                    "default": "",
                    "title": "名称"
                },
                "auto_mount": {
                    "type": "boolean",
                    "default": true,
                    "title": "自动挂载"
                },
                "mount_path": {
                    "type": "string",
                    "title": "挂载路径"
                },
                "mount_option": {
                    "type": "string",
                    "title": "挂载参数"
                },
                "type": {
                    "type": "string",
                    "title": "分区格式"
                },
                "uuid": {
                    "type": "string",
                    "title": "uuid"
                }
            },
            "required": [
                "uuid",
                "type",
                "name",
                "mount_path",
                "mount_option",
            ]
        },
        "backup_config": {
            "type": "object",
            "title": "备份设置"
        },
        "disk_path": {
            "type": "object",
            "title": "指定目录",
            "properties": {
                "type": {
                    "type": "string",
                    "default": "disk_path",
                    "options": {
                        "hidden": true
                    }
                },
                "disk_path": {
                    "type": "boolean",
                    "default": true,
                    "options": {
                        "hidden": true
                    }
                },
                "path": {
                    "type": "string",
                    "title": "目录",
                    "default": "/var/lib/docker"
                }
            },
            "required": [
                "type",
                "disk_path",
                "path"
            ]
        },
        "pool_img": {
            "type": "object",
            "title": "磁盘镜像",
            "properties": {
                "type": {
                    "type": "string",
                    "default": "pool_img",
                    "options": {
                        "hidden": true
                    }
                },
                "pool_img": {
                    "type": "boolean",
                    "default": true,
                    "options": {
                        "hidden": true
                    }
                },
                "config": {
                    "type": "object",
                    "title": "配置",
                    "anyOf": [
                        {
                            "type": "object",
                            "title": "现有的镜像",
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "default": "existed_img",
                                    "options": {
                                        "hidden": true
                                    }
                                },
                                "existed_img": {
                                    "type": "boolean",
                                    "default": true,
                                    "options": {
                                        "hidden": true
                                    }
                                },
                                "path": {
                                    "type": "string",
                                    "title": "路径"
                                }
                            },
                            "required": [
                                "type",
                                "existed_img",
                                "path"
                            ]
                        },
                        {
                            "type": "object",
                            "title": "新建镜像",
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "default": "new_img",
                                    "options": {
                                        "hidden": true
                                    }
                                },
                                "new_img": {
                                    "type": "boolean",
                                    "default": true,
                                    "options": {
                                        "hidden": true
                                    }
                                },
                                "fs_type": {
                                    "type": "string",
                                    "title": "文件格式",
                                    "default": "btrfs"
                                },
                                "fs_size": {
                                    "type": "string",
                                    "title": "文件大小",
                                    "default": "10G"
                                },
                                "path": {
                                    "type": "string",
                                    "title": "路径",
                                    "default": "docker.img"
                                }
                            },
                            "required": [
                                "type",
                                "new_img",
                                "fs_type",
                                "fs_size",
                                "path"
                            ]
                        }
                    ]
                }
            },
            "required": [
                "type",
                "pool_img",
                "config"
            ]
        },
        "pool_path": {
            "type": "object",
            "title": "指定目录",
            "properties": {
                "type": {
                    "type": "string",
                    "default": "pool_path",
                    "options": {
                        "hidden": true
                    }
                },
                "pool_path": {
                    "type": "boolean",
                    "default": true,
                    "options": {
                        "hidden": true
                    }
                },
                "path": {
                    "type": "string",
                    "title": "目录路径",
                }
            },
            "required": [
                "type",
                "pool_path",
                "path"
            ]
        },
        "pool": {
            "type": "object",
            "title": "指定存储池",
            "properties": {
                "type": {
                    "type": "string",
                    "default": "pool",
                    "options": {
                        "hidden": true
                    }
                },
                "pool": {
                    "type": "boolean",
                    "default": true,
                    "options": {
                        "hidden": true
                    }
                },
                "pool_name": {
                    "type": "string",
                    "format": "pool_select",
                    "title": "存储池名称",
                    "options": {
                        //pools: state.pools
                    }
                },
                "save": {
                    "type": "object",
                    "title": "保存位置",
                    "anyOf": [
                        { "$ref": "#/definitions/pool_img" },
                        { "$ref": "#/definitions/pool_path" },
                    ]
                }
            },
            "required": [
                "type",
                "pool",
                "pool_name",
                "save"
            ]
        },
        "save_path": {
            "type": "object",
            "title": "docker 存储配置",
            "anyOf": [
                { "$ref": "#/definitions/disk_path" },
                { "$ref": "#/definitions/pool" }
            ]
        },
        "docker_compose_config_new": {
            "type": "object",
            "title": "docker compose编排",
            "properties": {
                "proj_name": {
                    "type": "string",
                    "title": "项目名称",
                },
                "proj_dir": {
                    "type": "string",
                    "title": "项目位置",
                    "default": "/mnt/user/docker_project"
                },
                "auto_start": {
                    "type": "boolean",
                    "title": "自动启动",
                    "default": false
                },
                ".env": {
                    "type": "string",
                    "title": "环境变量配置",
                    "format": "ini",
                    "options": {
                        "ace": {
                            "mode": "ini",
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                        }
                    }
                },
                "docker-compose.yml": {
                    "type": "string",
                    "title": "编排文件",
                    "format": "yaml", //这个格式貌似有bug,前端会报错
                    "options": {
                        "ace": {
                            "mode": "yaml",
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                        }
                    }
                },
                "docker-compose.override.yml": {
                    "type": "string",
                    "title": "额外配置",
                    "format": "yaml",
                    "options": {
                        "ace": {
                            "mode": "yaml",
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                        }
                    }
                }
            },
            "required": [
                "proj_name",
                "proj_dir",
                "auto_start",
                ".env",
                "docker-compose.yml",
                "docker-compose.override.yml"
            ]
        },
        "docker_compose_config": {
            "type": "object",
            "title": "docker compose编排",
            "properties": {
                ".env": {
                    "type": "string",
                    "title": "环境变量配置",
                    "format": "ini",
                    "options": {
                        "ace": {
                            "mode": "ini",
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                        }
                    }
                },
                "docker-compose.yml": {
                    "type": "string",
                    "title": "编排文件",
                    "format": "yaml", //这个格式貌似有bug,前端会报错
                    "options": {
                        "ace": {
                            "mode": "yaml",
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                        }
                    }
                },
                "docker-compose.override.yml": {
                    "type": "string",
                    "title": "额外配置",
                    "format": "yaml",
                    "options": {
                        "ace": {
                            "mode": "yaml",
                            "theme": "ace/theme/vibrant_ink",
                            "tabSize": 2,
                            "useSoftTabs": true,
                        }
                    }
                }
            },
            "required": [
                ".env",
                "docker-compose.yml",
                "docker-compose.override.yml"
            ]
        },
        "docker_config": {
            "type": "object",
            "title": "docker 参数配置",
            "properties": {
                "auto_start": {
                    "type": "boolean",
                    "title": "自动启动",
                },
                "save_config": {
                    "type": "object",
                    "title": "存储位置",
                    "anyOf": [
                        { "$ref": "#/definitions/disk_path" },
                        { "$ref": "#/definitions/pool" }
                    ]
                },
                "bip": {
                    "type": "string",
                    "title": "ip范围",
                    "default": "172.10.0.1/24"
                },
                "mirror": {
                    "type": "array",
                    "title": "加速镜像",
                    "items": {
                        "type": "string"
                    }
                },
            },
            "required": [
                "auto_start",
                "save_config",
                "bip",
                "mirror",
            ]
        },
        "bcachefs_add_device": {
            "type": "object",
            "title": "加入到池",
            "properties": {
                "mount_path": {
                    "type": "string",
                    "default": "",
                    "title": "挂载路径"
                },
                "uuid": {
                    "type": "string",
                    "default": "",
                    "title": "uuid",
                    "options": {
                        "hidden": true
                    }
                },
                "device": {
                    "type": "string",
                    "format": "disk_select",
                },
                "label": {
                    "type": "string",
                    "title": "标签",
                    "default": ""
                },
                "fs_size": {
                    "type": "string",
                    "title": "fs_size",
                    "default": ""
                },
                "discard": {
                    "type": "boolean",
                    "title": "discard",
                    "default": false
                },
                "bucket": {
                    "type": "string",
                    "title": "bucket",
                    "default": ""
                }
            },
            "required": [
                "mount_path",
                "uuid",
                "device",
                "label",
                "fs_size",
                "discard",
                "bucket",
            ]
        }
    }
};
export default config_schema;
