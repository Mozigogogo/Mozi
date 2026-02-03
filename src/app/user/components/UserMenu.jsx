import React from 'react';
import { List } from 'antd-mobile';
import styles from '@/app/user/page.module.less';

const UserMenu = ({ footerList }) => {
  return (
    <div className={styles.footer}>
      <List className={styles.footerList}>
        {footerList.map((item, index) => {
          return (
            <List.Item key={index} className={`${styles.footerItem} ${index === footerList.length - 1 ? styles.last : ''}`} onClick={item.callback}>
              <div className={styles.footerBtn}>
                <div className={styles.icon}>{item.icon}</div>
                <div className={styles.text}>{item.text}</div>
                <div className={styles.extra}>{item.extra}</div>
              </div>
            </List.Item>
          );
        })}
      </List>
    </div>
  );
};

export default UserMenu;
