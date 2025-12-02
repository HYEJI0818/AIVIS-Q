'use client';

import { useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import CtUploadPanel from '@/components/upload/CtUploadPanel';
import MultiViewCtViewer from '@/components/viewer/MultiViewCtViewer';
import ViewControls from '@/components/viewer/ViewControls';
import PatientInfoCard from '@/components/sidepanel/PatientInfoCard';
import VolumeMetricsCard from '@/components/sidepanel/VolumeMetricsCard';
import ReferenceButton from '@/components/sidepanel/ReferenceButton';
import DownloadPanel from '@/components/download/DownloadPanel';
import DrawSegmentationModal from '@/components/modals/DrawSegmentationModal';
import ComparisonModal from '@/components/modals/ComparisonModal';
import PediatricReferenceModal from '@/components/modals/PediatricReferenceModal';
import { useCtSessionStore } from '@/store/useCtSessionStore';

export default function MainPage() {
  const { setPatientInfo, setVolumeMetrics } = useCtSessionStore();

  // Mock 데이터 설정 (개발/테스트용)
  useEffect(() => {
    // Mock 환자 정보
    setPatientInfo({
      name: '홍길동',
      sex: 'M',
      birthDate: '2010-05-15',
      studyDate: '2024-12-01',
      ageYears: 14,
    });

    // Mock 볼륨 메트릭
    setVolumeMetrics({
      liverVolumeEstimated: 1050.5,
      spleenVolumeEstimated: 115.3,
      ratioEstimated: 9.11,
      liverVolumeEdited: null,
      spleenVolumeEdited: null,
      ratioEdited: null,
    });
  }, [setPatientInfo, setVolumeMetrics]);

  return (
    <>
      <AppLayout
        left={
          <>
            {/* 업로드 패널 */}
            <CtUploadPanel />
            
            {/* 4분할 뷰어 (flex-1로 남은 공간 차지) */}
            <MultiViewCtViewer />
            
            {/* 뷰 컨트롤 */}
            <ViewControls />
          </>
        }
        right={
          <>
            {/* 환자 정보 카드 */}
            <PatientInfoCard />
            
            {/* 볼륨 메트릭 카드 */}
            <VolumeMetricsCard />
            
            {/* 소아 참고치 비교 버튼 */}
            <ReferenceButton />
            
            {/* 다운로드 패널 */}
            <DownloadPanel />
          </>
        }
      />

      {/* 모달들 */}
      <DrawSegmentationModal />
      <ComparisonModal />
      <PediatricReferenceModal />
    </>
  );
}

