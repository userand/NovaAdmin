-- 已初始化过的数据库执行本脚本(全新安装直接用 init.sql 即可，无需执行)
-- 1) 日志清空拆出独立权限 system:log:delete(此前借用查看权限 system:log:list，只读角色也能清空审计日志)
USE `nova_admin`;

INSERT IGNORE INTO `sys_menu` (`id`,`parent_id`,`name`,`type`,`perms`,`order_num`) VALUES
(1091, 109, '登录日志清空', 'F', 'system:log:delete', 1),
(1101, 110, '操作日志清空', 'F', 'system:log:delete', 1);

-- 超级管理员角色补齐关联(其余角色如需清空日志，请在"角色管理"里勾选对应按钮)
INSERT IGNORE INTO `sys_role_menu` (`role_id`,`menu_id`) VALUES (1,1091),(1,1101);

-- 2) 可选：清除历史操作日志里已明文落库的密码类参数(新版本已自动脱敏，旧数据需手动处理)
-- UPDATE `sys_operation_log` SET `params` = NULL WHERE `params` REGEXP 'pass|pwd|secret|token';
