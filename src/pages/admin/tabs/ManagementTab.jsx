import { useState } from 'react';
import { StudentsSection }   from './management/StudentsSection';
import { InstructorsSection } from './management/InstructorsSection';
import { AdminsSection }     from './management/AdminsSection';
import { GroupsSection }     from './management/GroupsSection';
import { TariffsSection }    from './management/TariffsSection';
import { InactiveSection }   from './management/InactiveSection';
import styles from '../AdminPage.module.css';

const MGMT_TABS = ['Студенты', 'Инструкторы', 'Администраторы', 'Учебные группы', 'Тарифы', 'Архив студентов'];

export function ManagementTab() {
  const [activeTab, setActiveTab] = useState('Студенты');

  return (
    <div className={styles.mgmtWrapper}>
      <div className={styles.mgmtTabs}>
        {MGMT_TABS.map(t => (
          <button key={t}
            className={`${styles.mgmtTab} ${activeTab === t ? styles.mgmtTabActive : ''}`}
            onClick={() => setActiveTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className={styles.mgmtBody}>
        {activeTab === 'Студенты'        && <StudentsSection />}
        {activeTab === 'Инструкторы'     && <InstructorsSection />}
        {activeTab === 'Администраторы'  && <AdminsSection />}
        {activeTab === 'Учебные группы'  && <GroupsSection />}
        {activeTab === 'Тарифы'          && <TariffsSection />}
        {activeTab === 'Архив студентов' && <InactiveSection />}
      </div>
    </div>
  );
}
