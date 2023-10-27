import api from '../api';

const samba = {
    async get_config() {
        let conf = await api.config_file({
            'op': 'get',
            'filename': '/etc/samba/smb.conf'
        });
        if(conf.ret == 0) {
            return conf.data;
        } else {
            throw conf;
        }
    },
    async save_config(content) {
        let ret = await api.config_file({
            'op': 'put',
            'filename': '/etc/samba/smb.conf',
            data: content
        });
        if(ret.ret == 0) {
            return ret.data;
        }
        throw ret;
    },
    async start() {
    },
    async stop() {
    },
    async restart() {
        await this.start();
        await this.stop();
    }
};


export default samba;
