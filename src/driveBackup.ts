import { getAccessToken } from './auth';

async function findFolderId(folderName: string, token: string): Promise<string | null> {
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error('Failed to search for folder on Google Drive');
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export const backupToDrive = async () => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in to backup to Google Drive.');
  }

  // Find the target folder
  const folderName = 'SpaceX Mission Tracker';
  const folderId = await findFolderId(folderName, token);

  // Fetch the zipped project from the backend
  const zipRes = await fetch('/api/backup-applet');
  if (!zipRes.ok) {
    throw new Error('Failed to generate project backup archive from server.');
  }
  const zipBlob = await zipRes.blob();

  // Prepare metadata
  const metadata: any = {
    name: `SpaceX_Mission_Tracker_Backup_${new Date().toISOString().slice(0, 10)}.zip`,
    mimeType: 'application/zip'
  };
  
  // Assign to folder if found
  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', zipBlob);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Failed to backup:', errText);
    throw new Error('Failed to backup to Google Drive');
  }

  return await res.json();
};
