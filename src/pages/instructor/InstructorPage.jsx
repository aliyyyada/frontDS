import { useState } from 'react';
import { ScheduleTab } from './tabs/ScheduleTab';
import { ProfileTab }  from './tabs/ProfileTab';
import { StudentsTab } from './tabs/StudentsTab';
import s from './instructor.module.css';

export default function InstructorPage() {
  const [tab, setTab]           = useState('schedule');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={s.app}>
      <div className={s.content}>
        {tab === 'students' && <StudentsTab />}
        {tab === 'schedule' && <ScheduleTab onEditModeChange={setIsEditing} />}
        {tab === 'profile'  && <ProfileTab />}
      </div>
      <nav className={`${s.bottomNav} ${isEditing ? s.navLocked : ''}`}>
        <button
          className={`${s.navItem} ${tab === 'students' ? s.navActive : ''}`}
          onClick={() => !isEditing && setTab('students')}
          title={isEditing ? 'Завершите редактирование' : ''}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className={`${s.navItem} ${tab === 'schedule' ? s.navActive : ''}`}
          onClick={() => setTab('schedule')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="8"  y1="2" x2="8"  y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="3"  y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
            <polyline points="9 16 11 18 15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className={`${s.navItem} ${tab === 'profile' ? s.navActive : ''}`}
          onClick={() => !isEditing && setTab('profile')}
          title={isEditing ? 'Завершите редактирование' : ''}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </nav>
    </div>
  );
}
