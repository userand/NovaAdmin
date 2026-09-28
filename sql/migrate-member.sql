-- 会员中心模块(手机/邮箱/微信登录 + 移动端接口) —— 幂等迁移脚本，可重复执行
-- 已初始化过的数据库执行本脚本即可；全新安装 init.sql 已包含同样内容。
USE `nova_admin`;

CREATE TABLE IF NOT EXISTS `app_user` (
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

CREATE TABLE IF NOT EXISTS `app_user_identity` (
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

CREATE TABLE IF NOT EXISTS `app_login_log` (
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
