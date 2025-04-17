/*  standalone_height_sampler_dense.cpp
 *
 *  Random Aztec‑diamond domino tiling *and* global height function on
 *  **every** lattice vertex |x|,|y| ≤ n with |x|+|y| ≤ n+1 – no more
 *  even‑parity restriction.
 *
 *  Key idea: our previous coordinate map was scaled by a factor 2, so
 *  all vertices landed on the even sub‑lattice.  Shrinking those local
 *  patterns by ×½ (i.e. dividing the ±4,±2 displacements by 2) fills in
 *  the missing odd sites automatically.
 *
 *  Compile & run exactly like before.
 */

#include <iostream>
#include <vector>
#include <map>
#include <queue>
#include <utility>
#include <tuple>
#include <random>
#include <cmath>
#include <cstdlib>
#include <iomanip>

using MatrixInt    = std::vector<std::vector<int>>;
using MatrixDouble = std::vector<std::vector<double>>;
using Vertex       = std::pair<int,int>;
using DominoVertex = std::pair<int,int>;
struct Cell{ double value; int flag; };
struct Domino{
    std::vector<DominoVertex> coords;   // 6 vertices per domino
    std::vector<double>       relH;     // local heights
};
using HeightMap = std::map<Vertex,double>;

static std::mt19937 rng(std::random_device{}());

inline bool inDomain(int x,int y,int n){
    return std::abs(x)<=n && std::abs(y)<=n && (std::abs(x)+std::abs(y)<=n+1);
}

void printHeightGrid(const HeightMap &H,int n)
{
    for(int y=n; y>=-n; --y){
        for(int x=-n; x<=n; ++x){
            if(!inDomain(x,y,n)){ std::cout<<"   "; continue; }
            auto it=H.find({x,y});
            int h=(it==H.end())?0:static_cast<int>(std::round(it->second));
            std::cout<<std::setw(3)<<h;
        }
        std::cout<<std::endl;
    }
}

/* ------------------------------------------------------------------ */
/*  Height function                                                   */
/* ------------------------------------------------------------------ */
HeightMap calculateHeightFunction(const MatrixInt &dom,bool n0)
{
    int size=dom.size();
    int n = n0;              // just to keep signature identical
    std::vector<Domino> D;
    D.reserve(size*size/4);

    for(int i=0;i<size;++i) for(int j=0;j<size;++j){
        if(dom[i][j]!=1) continue;
        bool oi=(i&1), oj=(j&1);
        std::vector<DominoVertex> v(6);
        std::vector<double> h(6,0.0);
        int vi=j-i;                 // *** scale‑½ mapping ***
        int vj=2*n-(i+j);
        if( oi &&  oj){            // blue horizontal domino (west‑east)
            v[0]={vi   ,vj   }; h[0]=-1;
            v[1]={vi+2 ,vj   }; h[1]=-1;
            v[2]={vi+2 ,vj-1 }; h[2]=-2;
            v[3]={vi   ,vj-1 }; h[3]=-2;
            v[4]={vi+1 ,vj   }; h[4]= 0;
            v[5]={vi+1 ,vj-1 }; h[5]=-3;
        }else if( oi && !oj){      // blue vertical domino (south‑north)
            v[0]={vi   ,vj   }; h[0]=-2;
            v[1]={vi   ,vj+2 }; h[1]=-2;
            v[2]={vi+1 ,vj+2 }; h[2]=-1;
            v[3]={vi+1 ,vj   }; h[3]=-1;
            v[4]={vi   ,vj+1 }; h[4]=-3;
            v[5]={vi+1 ,vj+1 }; h[5]= 0;
        }else if(!oi && !oj){      // red horizontal domino
            v[0]={vi   ,vj   }; h[0]= 1;
            v[1]={vi+2 ,vj   }; h[1]= 1;
            v[2]={vi+2 ,vj-1 }; h[2]= 2;
            v[3]={vi   ,vj-1 }; h[3]= 2;
            v[4]={vi+1 ,vj   }; h[4]= 0;
            v[5]={vi+1 ,vj-1 }; h[5]= 3;
        }else{                    // red vertical domino
            v[0]={vi   ,vj   }; h[0]= 2;
            v[1]={vi   ,vj+2 }; h[1]= 2;
            v[2]={vi+1 ,vj+2 }; h[2]= 1;
            v[3]={vi+1 ,vj   }; h[3]= 1;
            v[4]={vi   ,vj+1 }; h[4]= 3;
            v[5]={vi+1 ,vj+1 }; h[5]= 0;
        }
        D.push_back({v,h});
    }

    int m=D.size();
    std::vector<double> off(m,0.0);
    std::vector<char>   seen(m,0);
    std::map<DominoVertex,std::vector<int>> byV;
    for(int d=0;d<m;++d) for(auto &c:D[d].coords) byV[c].push_back(d);

    std::queue<int> q;
    for(int s=0;s<m;++s){
        if(seen[s]) continue;
        seen[s]=1; off[s]=0; q.push(s);
        while(!q.empty()){
            int u=q.front(); q.pop();
            for(int k=0;k<6;++k){
                auto c=D[u].coords[k];
                for(int v:byV[c]) if(!seen[v]){
                    int l=0; while(l<6 && D[v].coords[l]!=c) ++l;
                    off[v]=off[u]+(D[u].relH[k]-D[v].relH[l]);
                    seen[v]=1; q.push(v);
                }
            }
        }
    }

    HeightMap H;
    for(int d=0;d<m;++d) for(int k=0;k<6;++k)
        H[D[d].coords[k]] = off[d] + D[d].relH[k];
    return H;
}

/* -------------------------------------------------------------------- */
/* 2.  Exact sampling of Aztec‑diamond tilings (domino shuffling)        */
/* -------------------------------------------------------------------- */

// 2.1  Deterministic preprocessing on weight matrix
using Matrix    = std::vector<std::vector<Cell>>;

std::vector<Matrix> d3p(const MatrixDouble &x1)
{
    int n=x1.size();
    Matrix A(n,std::vector<Cell>(n));
    for(int i=0;i<n;++i) for(int j=0;j<n;++j)
        A[i][j] = (std::fabs(x1[i][j])<1e-9) ? Cell{1.0,1} : Cell{x1[i][j],0};

    std::vector<Matrix> AA; AA.push_back(A);
    int iter=n/2-1;          // n even
    for(int k=0;k<iter;++k){
        int nk=n-2*k-2;
        Matrix C(nk,std::vector<Cell>(nk));
        Matrix &prev = AA[k];
        for(int i=0;i<nk;++i){
            for(int j=0;j<nk;++j){
                int ii=i + 2*(i&1);
                int jj=j + 2*(j&1);
                const Cell &cur=prev[ii][jj];
                const Cell &diag=prev[i+1][j+1];
                const Cell &rt=prev[ii][j+1];
                const Cell &dn=prev[i+1][jj];
                double sum1=cur.flag+diag.flag;
                double sum2=rt.flag+dn.flag;
                double a2,a2s;
                if(std::fabs(sum1-sum2)<1e-9){
                    a2=cur.value*diag.value + rt.value*dn.value;
                    a2s=sum1;
                }else if(sum1<sum2){
                    a2=cur.value*diag.value;
                    a2s=sum1;
                }else{
                    a2=rt.value*dn.value;
                    a2s=sum2;
                }
                if(std::fabs(a2)<1e-9) a2=1e-9;
                C[i][j] = {cur.value/a2, cur.flag - int(a2s)};
            }
        }
        AA.push_back(C);
    }
    return AA;
}

// 2.2  Probabilities for creation step
std::vector<MatrixDouble> probs2(const MatrixDouble &x1)
{
    auto a0 = d3p(x1);
    int n=a0.size();
    std::vector<MatrixDouble> A;
    for(int k=0;k<n;++k){
        Matrix &mat=a0[n-k-1];
        int nk=mat.size();
        int rows=nk/2;
        MatrixDouble C(rows,std::vector<double>(rows,0.0));
        for(int i=0;i<rows;++i)
            for(int j=0;j<rows;++j){
                int i0=i<<1, j0=j<<1;
                int sum1=mat[i0][j0].flag + mat[i0+1][j0+1].flag;
                int sum2=mat[i0+1][j0].flag + mat[i0][j0+1].flag;
                if(sum1>sum2) C[i][j]=0.0;
                else if(sum1<sum2) C[i][j]=1.0;
                else{
                    double prod1=mat[i0+1][j0+1].value * mat[i0][j0].value;
                    double prod2=mat[i0+1][j0].value   * mat[i0][j0+1].value;
                    double d = prod1+prod2; if(std::fabs(d)<1e-9) d=1e-9;
                    C[i][j] = prod1/d;
                }
            }
        A.push_back(C);
    }
    return A;
}

// 2.3  Deletion/slide
MatrixInt delslide(const MatrixInt &x1)
{
    int n=x1.size();
    MatrixInt a0(n+2,std::vector<int>(n+2,0));
    for(int i=0;i<n;++i) for(int j=0;j<n;++j) a0[i+1][j+1]=x1[i][j];

    int half=n/2;
    // deletion
    for(int i=0;i<half;++i) for(int j=0;j<half;++j){
        int i2=i<<1, j2=j<<1;
        if(a0[i2][j2]==1 && a0[i2+1][j2+1]==1){
            a0[i2][j2]=a0[i2+1][j2+1]=0;
        }else if(a0[i2][j2+1]==1 && a0[i2+1][j2]==1){
            a0[i2+1][j2]=a0[i2][j2+1]=0;
        }
    }
    // slide
    for(int i=0;i<=half;++i) for(int j=0;j<=half;++j){
        int i2=i<<1, j2=j<<1;
        if(a0[i2+1][j2+1]==1){ a0[i2][j2]=1; a0[i2+1][j2+1]=0; }
        else if(a0[i2][j2]==1){ a0[i2][j2]=0; a0[i2+1][j2+1]=1; }
        else if(a0[i2+1][j2]==1){ a0[i2][j2+1]=1; a0[i2+1][j2]=0; }
        else if(a0[i2][j2+1]==1){ a0[i2+1][j2]=1; a0[i2][j2+1]=0; }
    }
    return a0;
}

// 2.4  Creation
MatrixInt create(MatrixInt x0, const MatrixDouble &p)
{
    int n=x0.size();
    int half=n/2;
    std::uniform_real_distribution<> dis(0.0,1.0);
    for(int i=0;i<half;++i) for(int j=0;j<half;++j){
        int i2=i<<1, j2=j<<1;
        if(x0[i2][j2]||x0[i2+1][j2]||x0[i2][j2+1]||x0[i2+1][j2+1]) continue;
        bool okL=j==0 || (x0[i2][j2-1]==0 && x0[i2+1][j2-1]==0);
        bool okR=j==half-1 || (x0[i2][j2+2]==0 && x0[i2+1][j2+2]==0);
        bool okD=i==0 || (x0[i2-1][j2]==0 && x0[i2-1][j2+1]==0);
        bool okU=i==half-1 || (x0[i2+2][j2]==0 && x0[i2+2][j2+1]==0);
        if(!(okL&&okR&&okD&&okU)) continue;
        if(dis(rng) < p[i][j]){
            x0[i2][j2]=x0[i2+1][j2+1]=1;         // \ domino
        }else{
            x0[i2+1][j2]=x0[i2][j2+1]=1;         // / domino
        }
    }
    return x0;
}

// 2.5  Main generator
MatrixInt aztecgen(const std::vector<MatrixDouble> &prob)
{
    int stages=prob.size();
    std::uniform_real_distribution<> dis(0.0,1.0);
    MatrixInt A;   // 2×2 start
    if(dis(rng) < prob[0][0][0]) A={{1,0},{0,1}}; else A={{0,1},{1,0}};
    for(int s=1;s<stages;++s){ A=delslide(A); A=create(A,prob[s]); }
    return A;
}


/* -------------------------------------------------------------------- */
/* 3.  Main program                                                     */
/* -------------------------------------------------------------------- */
int main()
{
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n=4;

    int dim = 2*n;
    MatrixDouble W(dim,std::vector<double>(dim,1.0));   // unit weights

    auto prob   = probs2(W);
    MatrixInt domino = aztecgen(prob);
    HeightMap  H     = calculateHeightFunction(domino,n);

    printHeightGrid(H,n);
    return 0;
}
