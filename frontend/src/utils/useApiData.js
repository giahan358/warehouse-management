import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../api/customerPortalApi';

export default function useApiData(loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const request = async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError('');
      try {
        const result = await loader();
        if (active) setData(result);
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };

    request();

    return () => {
      active = false;
    };
  }, [loader, revision]);

  return { data, loading, error, reload };
}
