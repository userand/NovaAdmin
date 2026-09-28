-- =====================================================================
-- Nova Admin · 商业级中后台基础框架 数据库初始化脚本
-- 适配 MySQL 5.7+ / 8.0  (字符集 utf8mb4)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `nova_admin` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `nova_admin`;

-- ---------------------------------------------------------------------
-- 1. 部门表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_dept`;
CREATE TABLE `sys_dept` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT COMMENT '部门ID',
  `parent_id`   BIGINT(20)   NOT NULL DEFAULT 0 COMMENT '父部门ID',
  `ancestors`   VARCHAR(255) NOT NULL DEFAULT '' COMMENT '祖级路径',
  `name`        VARCHAR(64)  NOT NULL COMMENT '部门名称',
  `order_num`   INT(4)       NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `leader`      VARCHAR(32)  DEFAULT '' COMMENT '负责人',
  `phone`       VARCHAR(18)  DEFAULT '' COMMENT '联系电话',
  `email`       VARCHAR(64)  DEFAULT '' COMMENT '邮箱',
  `status`      CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`     DATETIME     DEFAULT NULL COMMENT '删除时间(软删)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='部门表';

INSERT INTO `sys_dept` VALUES
(1, 0, '0',        '星云科技',   0, '林远', '13800000001', 'contact@nova.io',  '0', NOW(), NOW(), NULL),
(2, 1, '0,1',      '研发中心',   1, '陈默', '13800000002', 'rd@nova.io',       '0', NOW(), NOW(), NULL),
(3, 1, '0,1',      '产品设计部', 2, '苏晴', '13800000003', 'pd@nova.io',       '0', NOW(), NOW(), NULL),
(4, 1, '0,1',      '市场营销部', 3, '周野', '13800000004', 'mkt@nova.io',      '0', NOW(), NOW(), NULL),
(5, 2, '0,1,2',    '后端组',     1, '陈默', '', '',                              '0', NOW(), NOW(), NULL),
(6, 2, '0,1,2',    '前端组',     2, '许诺', '', '',                              '0', NOW(), NOW(), NULL),
(7, 2, '0,1,2',    '测试组',     3, '洛一', '', '',                              '0', NOW(), NOW(), NULL),
(8, 4, '0,1,4',    '渠道运营组', 1, '周野', '', '',                              '0', NOW(), NOW(), NULL);

-- ---------------------------------------------------------------------
-- 2. 用户表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `dept_id`     BIGINT(20)   DEFAULT NULL COMMENT '部门ID',
  `username`    VARCHAR(32)  NOT NULL COMMENT '登录账号',
  `nickname`    VARCHAR(32)  NOT NULL COMMENT '用户昵称',
  `email`       VARCHAR(64)  DEFAULT '' COMMENT '邮箱',
  `phone`       VARCHAR(18)  DEFAULT '' COMMENT '手机号',
  `gender`      CHAR(1)      NOT NULL DEFAULT '0' COMMENT '性别(0未知 1男 2女)',
  `avatar`      VARCHAR(255) DEFAULT '' COMMENT '头像地址',
  `password`    VARCHAR(100) NOT NULL COMMENT '密码(bcrypt)',
  `signature`   VARCHAR(255) DEFAULT '' COMMENT '个性签名',
  `status`      CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `last_login_at` DATETIME   DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(64) DEFAULT '' COMMENT '最后登录IP',
  `login_count` INT(11)      NOT NULL DEFAULT 0 COMMENT '登录次数',
  `created_by`  VARCHAR(32)  DEFAULT '' COMMENT '创建者',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`     DATETIME     DEFAULT NULL COMMENT '删除时间(软删)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户表';

-- 默认密码: Admin@123  (bcrypt hash)
INSERT INTO `sys_user` (`id`,`dept_id`,`username`,`nickname`,`email`,`phone`,`gender`,`avatar`,`password`,`signature`,`status`,`created_by`) VALUES
(1, 1, 'admin',     '系统管理员', 'admin@nova.io',     '13800000001', '1', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '守护系统稳定运行', '0', 'system'),
(2, 5, 'chenmo',    '陈默',       'chenmo@nova.io',    '13800000002', '1', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '代码即诗', '0', 'admin'),
(3, 6, 'xunuo',     '许诺',       'xunuo@nova.io',     '13800000003', '2', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '像素级还原设计稿', '0', 'admin'),
(4, 7, 'luoyi',     '洛一',       'luoyi@nova.io',     '13800000004', '2', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', 'Bug 终结者', '0', 'admin'),
(5, 3, 'suqing',    '苏晴',       'suqing@nova.io',    '13800000005', '2', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '体验至上', '0', 'admin'),
(6, 4, 'zhouye',    '周野',       'zhouye@nova.io',    '13800000006', '1', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '让增长飞一会儿', '0', 'admin'),
(7, 8, 'tangxin',   '唐欣',       'tangxin@nova.io',   '13800000007', '2', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '渠道即网络', '0', 'admin'),
(8, 1, 'audit01',   '审计专员',   'audit@nova.io',     '13800000008', '1', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '只读即安全', '0', 'admin');

-- ---------------------------------------------------------------------
-- 3. 角色表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `name`        VARCHAR(32)  NOT NULL COMMENT '角色名称',
  `code`        VARCHAR(64)  NOT NULL COMMENT '角色编码',
  `order_num`   INT(4)       NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `data_scope`  CHAR(1)      NOT NULL DEFAULT '1' COMMENT '数据范围(1全部 2自定义 3本部门 4本部门及以下 5仅本人)',
  `remark`      VARCHAR(255) DEFAULT '' COMMENT '备注',
  `status`      CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`     DATETIME     DEFAULT NULL COMMENT '删除时间(软删)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='角色表';

INSERT INTO `sys_role` VALUES
(1, '超级管理员', 'super_admin', 1, '1', '拥有系统全部权限', '0', NOW(), NOW(), NULL),
(2, '运营专员',   'operator',    2, '4', '负责日常运营内容维护', '0', NOW(), NOW(), NULL),
(3, '只读访客',   'viewer',      3, '5', '仅可查看各模块数据', '0', NOW(), NOW(), NULL);

-- ---------------------------------------------------------------------
-- 4. 用户-角色关联表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_user_role`;
CREATE TABLE `sys_user_role` (
  `user_id` BIGINT(20) NOT NULL COMMENT '用户ID',
  `role_id` BIGINT(20) NOT NULL COMMENT '角色ID',
  PRIMARY KEY (`user_id`,`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户角色关联表';

INSERT INTO `sys_user_role` VALUES
(1,1),(2,1),(3,2),(4,2),(5,2),(6,2),(7,2),(8,3);

-- ---------------------------------------------------------------------
-- 5. 菜单权限表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_menu`;
CREATE TABLE `sys_menu` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `parent_id`   BIGINT(20)   NOT NULL DEFAULT 0 COMMENT '父菜单ID',
  `name`        VARCHAR(64)  NOT NULL COMMENT '菜单名称',
  `type`        CHAR(1)      NOT NULL COMMENT '类型(M目录 C菜单 F按钮)',
  `path`        VARCHAR(255) DEFAULT '' COMMENT '路由地址',
  `component`   VARCHAR(255) DEFAULT '' COMMENT '组件路径',
  `perms`       VARCHAR(128) DEFAULT '' COMMENT '权限标识',
  `icon`        VARCHAR(64)  DEFAULT '' COMMENT '图标',
  `order_num`   INT(4)       NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `visible`     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否可见',
  `keep_alive`  TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否缓存',
  `status`      CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`     DATETIME     DEFAULT NULL COMMENT '删除时间(软删)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='菜单权限表';

INSERT INTO `sys_menu` (`id`,`parent_id`,`name`,`type`,`path`,`component`,`perms`,`icon`,`order_num`) VALUES
-- 首页/仪表盘
(1, 0, '仪表盘',   'C', '/dashboard', 'dashboard/index', '', 'Odometer', 0),
-- 系统管理
(100, 0, '系统管理', 'M', '/system',    '', '', 'Setting', 1),
(101, 100, '用户管理', 'C', '/system/user',       'system/user/index',       'system:user:list',    'User',     1),
(102, 100, '角色管理', 'C', '/system/role',       'system/role/index',       'system:role:list',    'UserFilled',2),
(103, 100, '菜单管理', 'C', '/system/menu',       'system/menu/index',       'system:menu:list',    'Menu',     3),
(104, 100, '部门管理', 'C', '/system/dept',       'system/dept/index',       'system:dept:list',    'OfficeBuilding', 4),
(105, 100, '字典管理', 'C', '/system/dict',       'system/dict/index',       'system:dict:list',    'Collection',5),
(106, 100, '参数设置', 'C', '/system/config',     'system/config/index',     'system:config:list',  'Slider',   6),
(107, 100, '通知公告', 'C', '/system/notice',     'system/notice/index',     'system:notice:list',  'Bell',     7),
(108, 100, '日志管理', 'M', '/system/log',        '', '', 'Document', 8),
(109, 108, '登录日志', 'C', '/system/log/login',     'system/log/login-log/index',     'system:log:list', 'Key', 1),
(110, 108, '操作日志', 'C', '/system/log/operation', 'system/log/operation-log/index', 'system:log:list', 'Tickets', 2),
-- 个人中心(隐藏菜单)
(900, 0, '个人中心', 'C', '/profile', 'profile/index', '', 'User', 98);

-- 用户管理按钮
INSERT INTO `sys_menu` (`id`,`parent_id`,`name`,`type`,`perms`,`order_num`) VALUES
(1011, 101, '用户新增', 'F', 'system:user:create', 1),
(1012, 101, '用户编辑', 'F', 'system:user:update', 2),
(1013, 101, '用户删除', 'F', 'system:user:delete', 3),
(1014, 101, '重置密码', 'F', 'system:user:resetPwd', 4),
(1021, 102, '角色新增', 'F', 'system:role:create', 1),
(1022, 102, '角色编辑', 'F', 'system:role:update', 2),
(1023, 102, '角色删除', 'F', 'system:role:delete', 3),
(1031, 103, '菜单新增', 'F', 'system:menu:create', 1),
(1032, 103, '菜单编辑', 'F', 'system:menu:update', 2),
(1033, 103, '菜单删除', 'F', 'system:menu:delete', 3),
(1041, 104, '部门新增', 'F', 'system:dept:create', 1),
(1042, 104, '部门编辑', 'F', 'system:dept:update', 2),
(1043, 104, '部门删除', 'F', 'system:dept:delete', 3),
(1051, 105, '字典新增', 'F', 'system:dict:create', 1),
(1052, 105, '字典编辑', 'F', 'system:dict:update', 2),
(1053, 105, '字典删除', 'F', 'system:dict:delete', 3),
(1061, 106, '参数新增', 'F', 'system:config:create', 1),
(1062, 106, '参数编辑', 'F', 'system:config:update', 2),
(1063, 106, '参数删除', 'F', 'system:config:delete', 3),
(1071, 107, '通知新增', 'F', 'system:notice:create', 1),
(1072, 107, '通知编辑', 'F', 'system:notice:update', 2),
(1073, 107, '通知删除', 'F', 'system:notice:delete', 3),
(1091, 109, '登录日志清空', 'F', 'system:log:delete', 1),
(1101, 110, '操作日志清空', 'F', 'system:log:delete', 1);

-- ---------------------------------------------------------------------
-- 6. 角色-菜单关联表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_role_menu`;
CREATE TABLE `sys_role_menu` (
  `role_id` BIGINT(20) NOT NULL COMMENT '角色ID',
  `menu_id` BIGINT(20) NOT NULL COMMENT '菜单ID',
  PRIMARY KEY (`role_id`,`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='角色菜单关联表';

-- 超级管理员: 全部菜单(前端对 super_admin 直接放行, 此处仍写入完整关联)
INSERT INTO `sys_role_menu` (`role_id`,`menu_id`)
SELECT 1, `id` FROM `sys_menu`;

-- 运营专员: 仪表盘 + 通知(查看/编辑) + 用户查看
INSERT INTO `sys_role_menu` (`role_id`,`menu_id`) VALUES
(2,1),(2,100),(2,107),(2,1072),(2,101);

-- 只读访客: 仪表盘 + 各列表查看
INSERT INTO `sys_role_menu` (`role_id`,`menu_id`) VALUES
(3,1),(3,100),(3,101),(3,102),(3,103),(3,104),(3,105),(3,106),(3,107),(3,108),(3,109),(3,110);

-- ---------------------------------------------------------------------
-- 7. 字典类型表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_dict_type`;
CREATE TABLE `sys_dict_type` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)  NOT NULL COMMENT '字典名称',
  `code`        VARCHAR(64)  NOT NULL COMMENT '字典编码',
  `status`      CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `remark`      VARCHAR(255) DEFAULT '' COMMENT '备注',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`     DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='字典类型表';

INSERT INTO `sys_dict_type` (`id`,`name`,`code`,`remark`) VALUES
(1, '系统开关',  'sys_status',   '通用启用/停用状态'),
(2, '用户性别',  'sys_gender',   '用户性别列表'),
(3, '通知类型',  'sys_notice',   '通知公告类型'),
(4, '操作类型',  'sys_oper_type','操作日志业务类型');

-- ---------------------------------------------------------------------
-- 8. 字典数据表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_dict_data`;
CREATE TABLE `sys_dict_data` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT,
  `type_code`   VARCHAR(64)  NOT NULL COMMENT '所属字典编码',
  `label`       VARCHAR(64)  NOT NULL COMMENT '标签',
  `value`       VARCHAR(64)  NOT NULL COMMENT '键值',
  `tag_type`    VARCHAR(32)  DEFAULT '' COMMENT '前端标签样式(primary/success/warning/danger/info)',
  `order_num`   INT(4)       NOT NULL DEFAULT 0 COMMENT '排序',
  `status`      CHAR(1)      NOT NULL DEFAULT '0',
  `remark`      VARCHAR(255) DEFAULT '',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`     DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='字典数据表';

INSERT INTO `sys_dict_data` (`id`,`type_code`,`label`,`value`,`tag_type`,`order_num`) VALUES
(1, 'sys_status',    '正常', '0', 'success', 1),
(2, 'sys_status',    '停用', '1', 'danger',  2),
(3, 'sys_gender',    '未知', '0', 'info',    1),
(4, 'sys_gender',    '男',   '1', 'primary', 2),
(5, 'sys_gender',    '女',   '2', 'warning', 3),
(6, 'sys_notice',    '通知', '1', 'primary', 1),
(7, 'sys_notice',    '公告', '2', 'success', 2),
(8, 'sys_oper_type', '其它', '0', 'info',    1),
(9, 'sys_oper_type', '新增', '1', 'success', 2),
(10,'sys_oper_type', '修改', '2', 'warning', 3),
(11,'sys_oper_type', '删除', '3', 'danger',  4),
(12,'sys_oper_type', '导出', '4', 'primary', 5),
(13,'sys_oper_type', '导入', '5', 'success', 6);

-- ---------------------------------------------------------------------
-- 9. 参数配置表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_config`;
CREATE TABLE `sys_config` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)  NOT NULL COMMENT '参数名称',
  `key`         VARCHAR(64)  NOT NULL COMMENT '参数键名',
  `value`       VARCHAR(255) NOT NULL DEFAULT '' COMMENT '参数键值',
  `is_builtin`  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否内置',
  `remark`      VARCHAR(255) DEFAULT '',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`     DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='参数配置表';

INSERT INTO `sys_config` (`id`,`name`,`key`,`value`,`is_builtin`,`remark`) VALUES
(1, '初始密码',     'sys.user.initPassword', 'Admin@123',  1, '新建用户的默认密码'),
(2, '账号锁定阈值', 'sys.login.failCount',   '5',          1, '连续失败N次后锁定'),
(3, '账号锁定时长', 'sys.login.lockMinutes', '10',         1, '锁定时长(分钟)'),
(4, '验证码开关',   'sys.login.captcha',     'true',       1, '登录是否开启验证码'),
(5, '注册开关',     'sys.account.register',  'false',      0, '是否允许自注册');

-- ---------------------------------------------------------------------
-- 10. 通知公告表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_notice`;
CREATE TABLE `sys_notice` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(128) NOT NULL COMMENT '标题',
  `type`        CHAR(1)      NOT NULL DEFAULT '1' COMMENT '类型(1通知 2公告)',
  `content`     TEXT         COMMENT '内容',
  `status`      CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0发布 1下线)',
  `top`         TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否置顶',
  `created_by`  VARCHAR(32)  DEFAULT '' COMMENT '发布人',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`     DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='通知公告表';

INSERT INTO `sys_notice` (`id`,`title`,`type`,`content`,`status`,`top`,`created_by`) VALUES
(1, 'Nova Admin v1.0 正式发布', '2', '<p>Nova Admin 商业级中后台框架正式发布，基于 NestJS + Vue3 + TypeScript 全栈方案，内置 RBAC 权限、操作审计、字典配置等企业级能力。</p>', '0', 1, 'admin'),
(2, '系统将于本周日 02:00 例行维护', '1', '<p>维护期间服务可能短暂不可用，请提前保存工作内容。</p>', '0', 0, 'admin'),
(3, '关于规范账号安全的通知', '1', '<p>请勿共享账号，开启强密码策略，定期修改密码。</p>', '0', 0, 'admin');

-- ---------------------------------------------------------------------
-- 11. 登录日志表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_login_log`;
CREATE TABLE `sys_login_log` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT,
  `username`    VARCHAR(64)  NOT NULL COMMENT '登录账号',
  `ip`          VARCHAR(64)  DEFAULT '' COMMENT '登录IP',
  `location`    VARCHAR(64)  DEFAULT '' COMMENT '登录地点',
  `browser`     VARCHAR(64)  DEFAULT '' COMMENT '浏览器',
  `os`          VARCHAR(64)  DEFAULT '' COMMENT '操作系统',
  `status`      CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0成功 1失败)',
  `message`     VARCHAR(128) DEFAULT '' COMMENT '提示消息',
  `login_time`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  PRIMARY KEY (`id`),
  KEY `idx_login_time` (`login_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='登录日志表';

-- 演示数据: 近7天登录趋势
INSERT INTO `sys_login_log` (`username`,`ip`,`status`,`message`,`login_time`) VALUES
('admin',  '127.0.0.1', '0', '登录成功', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('admin',  '127.0.0.1', '0', '登录成功', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('chenmo', '192.168.1.23', '0', '登录成功', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('xunuo',  '192.168.1.35', '0', '登录成功', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('luoyi',  '192.168.1.41', '0', '登录成功', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('suqing', '192.168.1.18', '1', '密码错误', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('suqing', '192.168.1.18', '0', '登录成功', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('zhouye', '10.8.2.66',  '0', '登录成功', DATE_SUB(NOW(), INTERVAL 4 DAY)),
('tangxin','10.8.2.71',  '0', '登录成功', DATE_SUB(NOW(), INTERVAL 5 DAY)),
('admin',  '127.0.0.1',  '0', '登录成功', DATE_SUB(NOW(), INTERVAL 6 DAY)),
('audit01','172.16.0.9', '0', '登录成功', DATE_SUB(NOW(), INTERVAL 6 DAY)),
('admin',  '127.0.0.1',  '1', '验证码错误', DATE_SUB(NOW(), INTERVAL 7 DAY));

-- ---------------------------------------------------------------------
-- 12. 操作日志表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_operation_log`;
CREATE TABLE `sys_operation_log` (
  `id`          BIGINT(20)   NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(64)  NOT NULL COMMENT '操作模块',
  `action`      VARCHAR(64)  DEFAULT '' COMMENT '操作名称',
  `method`      VARCHAR(10)  DEFAULT '' COMMENT '请求方式',
  `url`         VARCHAR(255) DEFAULT '' COMMENT '请求地址',
  `params`      TEXT         COMMENT '请求参数',
  `ip`          VARCHAR(64)  DEFAULT '' COMMENT '操作IP',
  `username`    VARCHAR(64)  DEFAULT '' COMMENT '操作人',
  `status`      CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0成功 1失败)',
  `error_msg`   VARCHAR(512) DEFAULT '' COMMENT '错误消息',
  `cost_ms`     INT(11)      DEFAULT 0 COMMENT '耗时(毫秒)',
  `oper_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_oper_time` (`oper_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='操作日志表';

INSERT INTO `sys_operation_log` (`title`,`action`,`method`,`url`,`ip`,`username`,`status`,`cost_ms`,`oper_time`) VALUES
('用户管理', '新增', 'POST', '/users', '127.0.0.1', 'admin', '0', 86, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('角色管理', '修改', 'PUT', '/roles/2', '127.0.0.1', 'admin', '0', 42, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
('参数设置', '修改', 'PUT', '/configs/5', '192.168.1.23', 'chenmo', '0', 31, DATE_SUB(NOW(), INTERVAL 1 DAY)),
('通知公告', '新增', 'POST', '/notices', '192.168.1.18', 'suqing', '0', 55, DATE_SUB(NOW(), INTERVAL 2 DAY)),
('用户管理', '删除', 'DELETE', '/users/9', '127.0.0.1', 'admin', '0', 38, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('字典管理', '修改', 'PUT', '/dict-data/13', '192.168.1.35', 'xunuo', '1', 120, DATE_SUB(NOW(), INTERVAL 4 DAY));

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 初始化完成。默认超级管理员账号: admin / Admin@123
-- =====================================================================

-- ===== 会员中心模块 =====
DROP TABLE IF EXISTS `app_user`;
CREATE TABLE `app_user` (
  `id`            BIGINT(20)   NOT NULL AUTO_INCREMENT COMMENT '会员ID',
  `nickname`      VARCHAR(64)  NOT NULL COMMENT '昵称',
  `avatar`        VARCHAR(255) DEFAULT '' COMMENT '头像',
  `gender`        CHAR(1)      NOT NULL DEFAULT '0' COMMENT '性别(0未知 1男 2女)',
  `birthday`      DATE         DEFAULT NULL COMMENT '生日',
  `phone`         VARCHAR(20)  DEFAULT NULL COMMENT '手机号(唯一，可空)',
  `email`         VARCHAR(128) DEFAULT NULL COMMENT '邮箱(唯一，可空)',
  `password`      VARCHAR(100) DEFAULT NULL COMMENT '密码(bcrypt，可空=未设置密码)',
  `status`        CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `source`        VARCHAR(16)  NOT NULL DEFAULT 'phone' COMMENT '注册来源(phone/email/wechat/admin)',
  `remark`        VARCHAR(255) DEFAULT '' COMMENT '后台备注',
  `token_version` INT(11)      NOT NULL DEFAULT 0 COMMENT '令牌版本：踢下线/改密/停用时+1，旧令牌立即失效',
  `last_login_at` DATETIME     DEFAULT NULL,
  `last_login_ip` VARCHAR(64)  DEFAULT '',
  `login_count`   INT(11)      NOT NULL DEFAULT 0,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       DATETIME     DEFAULT NULL COMMENT '删除时间(软删)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_phone` (`phone`),
  UNIQUE KEY `uk_app_email` (`email`),
  KEY `idx_app_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会员表(移动端/C 端用户，与后台 sys_user 完全独立)';

DROP TABLE IF EXISTS `app_user_identity`;
CREATE TABLE `app_user_identity` (
  `id`         BIGINT(20)  NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT(20)  NOT NULL COMMENT '会员ID',
  `provider`   VARCHAR(16) NOT NULL COMMENT '第三方平台(wechat_mp 小程序 / wechat_app 移动应用 / wechat_h5 公众号)',
  `open_id`    VARCHAR(64) NOT NULL COMMENT '平台 openid',
  `union_id`   VARCHAR(64) DEFAULT NULL COMMENT '微信开放平台 unionid(跨应用识别同一用户)',
  `nickname`   VARCHAR(64) DEFAULT '',
  `avatar`     VARCHAR(255) DEFAULT '',
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_identity` (`provider`,`open_id`),
  KEY `idx_identity_user` (`user_id`),
  KEY `idx_identity_union` (`union_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会员第三方身份表(微信等)';

DROP TABLE IF EXISTS `app_login_log`;
CREATE TABLE `app_login_log` (
  `id`         BIGINT(20)   NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT(20)   DEFAULT NULL COMMENT '会员ID(登录失败且账号不存在时为空)',
  `account`    VARCHAR(128) NOT NULL DEFAULT '' COMMENT '登录账号(手机/邮箱/微信标识)',
  `method`     VARCHAR(16)  NOT NULL COMMENT '登录方式(phone_code/email_code/password/wechat/refresh)',
  `client`     VARCHAR(16)  NOT NULL DEFAULT '' COMMENT '客户端(X-Client 请求头：ios/android/mp/h5…)',
  `ip`         VARCHAR(64)  DEFAULT '',
  `location`   VARCHAR(64)  DEFAULT '',
  `os`         VARCHAR(64)  DEFAULT '',
  `status`     CHAR(1)      NOT NULL DEFAULT '0' COMMENT '状态(0成功 1失败)',
  `message`    VARCHAR(128) DEFAULT '',
  `login_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_applog_time` (`login_time`),
  KEY `idx_applog_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会员登录日志表';


-- 会员中心：目录 + 3 个页面 + 按钮权限
INSERT IGNORE INTO `sys_menu` (`id`,`parent_id`,`name`,`type`,`path`,`component`,`perms`,`icon`,`order_num`) VALUES
(200, 0,   '会员中心',     'M', '/member',         '',                          '',                       'Users',      2),
(201, 200, '会员管理',     'C', '/member/list',    'member/list/index',         'member:list',            'Contact',    1),
(202, 200, '登录方式',     'C', '/member/setting', 'member/setting/index',      'member:setting:list',    'Smartphone', 2),
(203, 200, '会员登录日志', 'C', '/member/log',     'member/log/index',          'member:log:list',        'Tickets',    3);

INSERT IGNORE INTO `sys_menu` (`id`,`parent_id`,`name`,`type`,`perms`,`order_num`) VALUES
(2011, 201, '会员新增',     'F', 'member:create',         1),
(2012, 201, '会员编辑',     'F', 'member:update',         2),
(2013, 201, '会员删除',     'F', 'member:delete',         3),
(2014, 201, '会员重置密码', 'F', 'member:resetPwd',       4),
(2021, 202, '保存登录设置', 'F', 'member:setting:update', 1);

-- 超级管理员补齐新菜单关联(其余角色请在"角色管理"里按需勾选)
INSERT IGNORE INTO `sys_role_menu` (`role_id`,`menu_id`)
SELECT 1, `id` FROM `sys_menu` WHERE `id` IN (200,201,202,203,2011,2012,2013,2014,2021);

-- 登录方式开关(可在"会员中心 → 登录方式"页面修改)
INSERT IGNORE INTO `sys_config` (`name`,`key`,`value`,`is_builtin`,`remark`) VALUES
('会员自助注册',     'member.register.enabled', 'true', 1, '验证码/微信首次登录时是否自动注册会员'),
('会员·手机验证码登录', 'member.login.phone',    'true', 1, '手机号 + 短信验证码'),
('会员·邮箱验证码登录', 'member.login.email',    'true', 1, '邮箱 + 邮件验证码'),
('会员·账号密码登录',   'member.login.password', 'true', 1, '手机号/邮箱 + 密码'),
('会员·微信登录',       'member.login.wechat',   'true', 1, '小程序 / App / 公众号 H5');
