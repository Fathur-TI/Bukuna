import React from 'react';
import { useParams } from 'react-router-dom';
import CreateStory from './CreateStory';

/**
 * Halaman Edit Cerita Pengguna (/cerita/:id/edit) (src/pages/EditStory.jsx)
 * Memuat cerita berdasarkan :id ke dalam Wizard 3 langkah untuk mengubah info, halaman, urutan, atau status.
 */
export default function EditStory() {
  const { id } = useParams();
  return <CreateStory editStoryId={id} />;
}

