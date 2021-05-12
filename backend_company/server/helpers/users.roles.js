const userPrivileges = {
    admin: [
            {
                link: '/login/signin',
                methods: ['POST']
            }
        ]
}

module.exports = {
    getRoles: Object.getOwnPropertyNames(userPrivileges),
    getUserRouterPrivilege: async function(role, api, method)
    {
        let flag = false;

        if(typeof userPrivileges[role] == 'undefined')
            return flag;
        
        userPrivileges[role].forEach(function(data){
            if(data.link == api && (data.methods).indexOf(method) > -1)
            {
                flag = true;
            }
        })
        
        return flag;
    }
}