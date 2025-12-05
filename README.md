### Vless+ws+tls 单节点部署+多优选域名方案 说明：

* 适用DirectAdmin面板node.js环境 
   （webfreecloud，Web.C-Servers等）

* 多区域优选域名覆盖，延迟低，网络表现更佳！

-----------------------------------------------------------

### 使用方法：

* 1：域名托管至Cloudflare，添加一条DNS记录

* 2：index.js+package.json上传至服务器public_html目录
   修改index.js中的3个变量：UUID/DOMAIN/PORT

* 3：进入面板：附加功能--Setup Node.js APP
   
     输入：
          public_html 和 index.js

     然后：
           CREATE APPLICATION，运行两次
          （如出现异常提示，进入第5条）
   
* 4：域名/UUID，浏览器访问可见节点链接地址

* 5：CREATE APPLICATION出现异常提醒、APP无法删除？教程视频：
