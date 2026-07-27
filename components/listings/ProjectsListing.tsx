import Link from 'next/link';
import { assetUrl, postHref } from '@/lib/slug';

interface Project {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  thumbnail_url?: string | null;
}

export function ProjectsListing({
  title,
  projects,
}: {
  title: string;
  projects: Project[];
}) {
  return (
    <div className="container body_bg project">
      <div className="title" style={{ marginTop: 24 }}>
        <p>
          <span>{title}</span>
        </p>
      </div>
      {!projects.length ? (
        <p style={{ padding: '24px 0', textAlign: 'center', color: '#666' }}>
          Chưa có dự án nào. Thêm trong Super Admin → Dự án.
        </p>
      ) : (
        <div className="row list_project">
          {projects.map((p) => (
            <div key={p.id} className="col-12 col-md-6 item">
              <dl>
                <dt>
                  <div className="swing">
                    <figure>
                      <Link href={postHref(p.slug)}>
                        {p.thumbnail_url && (
                          <img src={assetUrl(p.thumbnail_url)} alt={p.title} />
                        )}
                      </Link>
                    </figure>
                  </div>
                </dt>
                <dd>
                  <h3>
                    <Link href={postHref(p.slug)}>{p.title}</Link>
                  </h3>
                  {p.excerpt && <p>{p.excerpt}</p>}
                  <Link href={postHref(p.slug)} />
                </dd>
                <div className="clearfix" />
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
